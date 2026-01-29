"use client"

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Notification, PaginatedResponse } from '@/lib/types'

interface StoredNotification extends Notification {
  isNew?: boolean
  storedAt: string
}

const STORAGE_KEY = 'local_notifications'

export function useNotifications() {
  const [storedNotifications, setStoredNotifications] = useState<StoredNotification[]>([])
  const queryClient = useQueryClient()

  // Load notifications from localStorage on mount
  useEffect(() => {
    const loadStoredNotifications = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setStoredNotifications(parsed)
        }
      } catch (error) {
        console.error('Error loading stored notifications:', error)
      }
    }

    loadStoredNotifications()
  }, [])

  // Save notifications to localStorage
  const saveNotificationsToStorage = (notifications: StoredNotification[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
      setStoredNotifications(notifications)
    } catch (error) {
      console.error('Error saving notifications to storage:', error)
    }
  }

  // Fetch notifications from API
  const { data: apiNotifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Notification>>("/mobcash/notification")
      return response.data
    },
    refetchInterval: 120000, // Refresh every 2 minutes
  })

  // Mark all notifications as read API call
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/mobcash/read-notification")
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      queryClient.invalidateQueries({ queryKey: ["notification-count"] })
    },
  })

  // Process API notifications and store them locally
  useEffect(() => {
    if (apiNotifications?.results && apiNotifications.results.length > 0) {
      const newStoredNotifications: StoredNotification[] = apiNotifications.results.map(notification => ({
        ...notification,
        isNew: true, // Mark as new when first loaded
        storedAt: new Date().toISOString(),
      }))

      // Mark all as read in API
      markAllAsReadMutation.mutate()

      // Store locally
      saveNotificationsToStorage(newStoredNotifications)
    }
  }, [apiNotifications])

  // Clear all notifications
  const clearAllNotifications = () => {
    saveNotificationsToStorage([])
  }

  // Get notification count (from API)
  const notificationCount = apiNotifications?.count || 0

  // Get combined notifications (stored + any new API notifications)
  const allNotifications = storedNotifications.map(notification => ({
    ...notification,
    // Mark as old if stored more than 24 hours ago
    isOld: new Date(notification.storedAt) < new Date(Date.now() - 24 * 60 * 60 * 1000),
  }))

  return {
    notifications: allNotifications,
    notificationCount,
    isLoading,
    clearAllNotifications,
    storedNotifications,
  }
}
