'use client'

import { useState, useEffect } from 'react'
import { Comment, Task } from '@/store/task-store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Edit3, Trash2, MessageSquare } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface CommentsProps {
  task: Task
}

export function Comments({ task }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { updateTaskComments } = useTaskStore()
  const { toast } = useToast()

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data)
        updateTaskComments(task.id, data)
      }
    } catch (error) {
      console.error('Failed to load comments:', error)
    }
  }

  useEffect(() => {
    loadComments()
  }, [task.id])

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    setIsLoading(true)

    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      })

      if (res.ok) {
        const comment = await res.json()
        const updatedComments = [comment, ...comments]
        setComments(updatedComments)
        updateTaskComments(task.id, updatedComments)
        setNewComment('')
        toast({
          title: 'Comment added',
          description: 'Your comment has been posted.',
        })
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
      toast({
        title: 'Failed to add comment',
        description: 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })

      if (res.ok) {
        const updatedComment = await res.json()
        const updatedComments = comments.map(c =>
          c.id === commentId ? { ...c, ...updatedComment } : c
        )
        setComments(updatedComments)
        updateTaskComments(task.id, updatedComments)
        setEditingComment(null)
        setEditContent('')
        toast({
          title: 'Comment updated',
          description: 'Your comment has been updated.',
        })
      }
    } catch (error) {
      console.error('Failed to update comment:', error)
      toast({
        title: 'Failed to update comment',
        description: 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
      const updatedComments = comments.filter(c => c.id !== commentId)
      setComments(updatedComments)
      updateTaskComments(task.id, updatedComments)
      toast({
        title: 'Comment deleted',
        description: 'Your comment has been removed.',
      })
    } catch (error) {
      console.error('Failed to delete comment:', error)
      toast({
        title: 'Failed to delete comment',
        description: 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const startEdit = (comment: Comment) => {
    setEditingComment(comment.id)
    setEditContent(comment.content)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-semibold">
          Comments ({comments.length})
        </h3>
      </div>

      {/* New Comment Form */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[60px] max-h-[120px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleAddComment()
            }
          }}
        />
        <Button onClick={handleAddComment} disabled={!newComment.trim() || isLoading} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Comments List */}
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No comments yet. Be the first to add one!
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={cn(
                  "p-3 rounded-lg border bg-card",
                  editingComment === comment.id && "ring-2 ring-primary"
                )}
              >
                {editingComment === comment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[60px]"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingComment(null)
                          setEditContent('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleEditComment(comment.id)}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => startEdit(comment)}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
