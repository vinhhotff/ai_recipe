# AI Recipe Interactions API Documentation

This document describes the API endpoints for AI Recipe likes and comments functionality.

## Overview

The AI Recipe Interactions system allows users to:
- Like/unlike AI-generated recipes
- Comment on AI-generated recipes
- Reply to comments (nested/threaded comments)
- Edit and delete their own comments
- View like counts and comment statistics

## Authentication

All endpoints require JWT authentication. The token should be sent as an HTTP-only cookie named `access_token`.

## API Endpoints

### AI Recipe Likes

#### Toggle Like/Unlike Recipe
```
POST /api/api/ai-recipe-likes/toggle
```

**Request Body:**
```json
{
  "recipeId": "uuid-string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Recipe liked successfully", // or "Recipe unliked successfully"
  "data": {
    "liked": true, // or false
    "like": { // only present when liked = true
      "id": "uuid-string",
      "userId": "uuid-string", 
      "recipeId": "uuid-string",
      "createdAt": "2025-09-21T10:56:01.809Z"
    }
  }
}
```

#### Get Like Status for Current User
```
GET /api/api/ai-recipe-likes/status/{recipeId}
```

**Response:**
```json
{
  "success": true,
  "message": "Like status retrieved successfully",
  "data": {
    "liked": true,
    "likeId": "uuid-string" // only present when liked = true
  }
}
```

#### Get Like Count for Recipe
```
GET /api/api/ai-recipe-likes/count/{recipeId}
```

**Response:**
```json
{
  "success": true,
  "message": "Like count retrieved successfully", 
  "data": {
    "count": 42
  }
}
```

#### Get Likes with Filtering
```
GET /api/api/ai-recipe-likes?recipeId={uuid}&userId={uuid}
```

**Query Parameters:**
- `recipeId` (optional): Filter likes for specific recipe
- `userId` (optional): Filter likes by specific user

**Response:**
```json
{
  "success": true,
  "message": "Likes retrieved successfully",
  "data": [
    {
      "id": "uuid-string",
      "userId": "uuid-string",
      "recipeId": "uuid-string", 
      "createdAt": "2025-09-21T10:56:01.809Z"
    }
  ],
  "meta": {
    "total": 10,
    "recipeId": "uuid-string", // if filtered by recipe
    "userId": "uuid-string" // if filtered by user
  }
}
```

#### Remove Specific Like
```
DELETE /api/api/ai-recipe-likes/{likeId}
```
*Note: Only like owner or admin can remove*

**Response:**
```json
{
  "success": true,
  "message": "Like removed successfully"
}
```

### AI Recipe Comments

#### Create Comment or Reply
```
POST /api/api/ai-recipe-comments
```

**Request Body:**
```json
{
  "recipeId": "uuid-string",
  "content": "This recipe looks delicious!",
  "parentCommentId": "uuid-string" // optional, for replies
}
```

**Response:**
```json
{
  "success": true,
  "message": "Comment created successfully",
  "data": {
    "id": "uuid-string",
    "userId": "uuid-string",
    "recipeId": "uuid-string",
    "content": "This recipe looks delicious!",
    "parentCommentId": null, // or uuid-string for replies
    "isDeleted": false,
    "createdAt": "2025-09-21T10:56:52.832Z",
    "updatedAt": "2025-09-21T10:56:52.832Z",
    "user": {
      "id": "uuid-string",
      "name": "John Doe",
      "email": "user@example.com"
    }
  }
}
```

#### Get Comments with Pagination and Threading
```
GET /api/api/ai-recipe-comments?recipeId={uuid}&page=1&limit=20&includeReplies=true
```

**Query Parameters:**
- `recipeId` (optional): Filter by recipe
- `userId` (optional): Filter by user
- `parentCommentId` (optional): Get replies for specific comment (null for top-level)
- `includeDeleted` (optional, default: false): Include soft-deleted comments
- `includeReplies` (optional, default: true): Include nested replies
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page

**Response:**
```json
{
  "success": true,
  "message": "Comments retrieved successfully",
  "data": [
    {
      "id": "uuid-string",
      "userId": "uuid-string", 
      "recipeId": "uuid-string",
      "content": "This recipe looks delicious!",
      "parentCommentId": null,
      "isDeleted": false,
      "createdAt": "2025-09-21T10:56:52.832Z",
      "updatedAt": "2025-09-21T10:56:52.832Z",
      "user": {
        "id": "uuid-string",
        "name": "John Doe", 
        "email": "user@example.com"
      },
      "replies": [
        {
          "id": "uuid-string",
          "userId": "uuid-string",
          "recipeId": "uuid-string", 
          "content": "I agree! Very tasty.",
          "parentCommentId": "parent-uuid-string",
          "isDeleted": false,
          "createdAt": "2025-09-21T10:57:03.256Z",
          "updatedAt": "2025-09-21T10:57:03.256Z",
          "user": {
            "id": "uuid-string",
            "name": "Jane Smith",
            "email": "jane@example.com"
          }
        }
      ],
      "replyCount": 1
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "recipeId": "uuid-string"
  }
}
```

#### Get Specific Comment by ID
```
GET /api/api/ai-recipe-comments/{commentId}
```

**Response:**
```json
{
  "success": true,
  "message": "Comment retrieved successfully", 
  "data": {
    "id": "uuid-string",
    "userId": "uuid-string",
    "recipeId": "uuid-string",
    "content": "This recipe looks delicious!",
    "parentCommentId": null,
    "isDeleted": false,
    "createdAt": "2025-09-21T10:56:52.832Z", 
    "updatedAt": "2025-09-21T10:56:52.832Z",
    "user": {
      "id": "uuid-string",
      "name": "John Doe",
      "email": "user@example.com"
    },
    "replies": [...], // array of replies
    "replyCount": 3
  }
}
```

#### Update Comment
```
PUT /api/api/ai-recipe-comments/{commentId}
```
*Note: Only comment owner or admin can update*

**Request Body:**
```json
{
  "content": "Updated comment content"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Comment updated successfully",
  "data": {
    "id": "uuid-string",
    "userId": "uuid-string", 
    "recipeId": "uuid-string",
    "content": "Updated comment content",
    "parentCommentId": null,
    "isDeleted": false,
    "createdAt": "2025-09-21T10:56:52.832Z",
    "updatedAt": "2025-09-21T10:57:32.315Z", // updated timestamp
    "user": {
      "id": "uuid-string",
      "name": "John Doe",
      "email": "user@example.com"
    }
  }
}
```

#### Delete Comment (Soft Delete)
```
DELETE /api/api/ai-recipe-comments/{commentId}
```
*Note: Only comment owner or admin can delete*

**Response:**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

#### Get Comment Statistics
```
GET /api/api/ai-recipe-comments/count/{recipeId}
```

**Response:**
```json
{
  "success": true,
  "message": "Comment count retrieved successfully",
  "data": {
    "count": 15, // total comments (including replies)
    "topLevelCount": 8, // top-level comments only
    "replyCount": 7 // replies only
  }
}
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "statusCode": 400, // or 401, 403, 404, 500
  "timestamp": "2025-09-21T10:58:00.000Z",
  "path": "/api/api/ai-recipe-likes/toggle",
  "method": "POST",
  "message": "Error description",
  "error": "Detailed error information"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: User doesn't have permission
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Frontend Integration Examples

### React Hook for Recipe Likes

```typescript
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface UseLikeReturn {
  isLiked: boolean;
  likeCount: number;
  toggleLike: () => Promise<void>;
  loading: boolean;
}

export function useRecipeLike(recipeId: string): UseLikeReturn {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load initial like status and count
    Promise.all([
      apiClient.get(`/api/ai-recipe-likes/status/${recipeId}`),
      apiClient.get(`/api/ai-recipe-likes/count/${recipeId}`)
    ]).then(([statusRes, countRes]) => {
      setIsLiked(statusRes.data.data.liked);
      setLikeCount(countRes.data.data.count);
    });
  }, [recipeId]);

  const toggleLike = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/api/ai-recipe-likes/toggle', {
        recipeId
      });
      
      setIsLiked(response.data.data.liked);
      
      // Refresh like count
      const countRes = await apiClient.get(`/api/ai-recipe-likes/count/${recipeId}`);
      setLikeCount(countRes.data.data.count);
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  };

  return { isLiked, likeCount, toggleLike, loading };
}
```

### React Hook for Recipe Comments

```typescript
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface Comment {
  id: string;
  content: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  replies: Comment[];
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  createComment: (content: string, parentId?: string) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export function useRecipeComments(recipeId: string): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadComments = async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/api/ai-recipe-comments?recipeId=${recipeId}&page=${pageNum}&limit=20`
      );
      
      const newComments = response.data.data;
      if (append) {
        setComments(prev => [...prev, ...newComments]);
      } else {
        setComments(newComments);
      }
      
      setHasMore(response.data.meta.page < response.data.meta.totalPages);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments(1, false);
  }, [recipeId]);

  const createComment = async (content: string, parentId?: string) => {
    try {
      await apiClient.post('/api/ai-recipe-comments', {
        recipeId,
        content,
        parentCommentId: parentId
      });
      
      // Reload comments
      await loadComments(1, false);
      setPage(1);
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  };

  const updateComment = async (commentId: string, content: string) => {
    try {
      await apiClient.put(`/api/ai-recipe-comments/${commentId}`, {
        content
      });
      
      // Reload comments
      await loadComments(1, false);
      setPage(1);
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      await apiClient.delete(`/api/ai-recipe-comments/${commentId}`);
      
      // Reload comments
      await loadComments(1, false);
      setPage(1);
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;
    
    const nextPage = page + 1;
    await loadComments(nextPage, true);
    setPage(nextPage);
  };

  return {
    comments,
    loading,
    createComment,
    updateComment, 
    deleteComment,
    loadMore,
    hasMore
  };
}
```

### Sample React Components

```tsx
// LikeButton.tsx
import { Heart, HeartIcon } from 'lucide-react';
import { useRecipeLike } from '@/hooks/useRecipeLike';

interface LikeButtonProps {
  recipeId: string;
}

export function LikeButton({ recipeId }: LikeButtonProps) {
  const { isLiked, likeCount, toggleLike, loading } = useRecipeLike(recipeId);

  return (
    <button
      onClick={toggleLike}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        isLiked 
          ? 'bg-red-50 text-red-600 border border-red-200' 
          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
      }`}
    >
      {isLiked ? (
        <HeartIcon className="w-5 h-5 fill-current" />
      ) : (
        <Heart className="w-5 h-5" />
      )}
      <span>{likeCount}</span>
    </button>
  );
}
```

```tsx
// CommentSection.tsx
import { useState } from 'react';
import { useRecipeComments } from '@/hooks/useRecipeComments';

interface CommentSectionProps {
  recipeId: string;
}

export function CommentSection({ recipeId }: CommentSectionProps) {
  const {
    comments,
    loading,
    createComment,
    updateComment,
    deleteComment,
    loadMore,
    hasMore
  } = useRecipeComments(recipeId);

  const [newComment, setNewComment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await createComment(newComment);
      setNewComment('');
    } catch (error) {
      // Handle error
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Comments</h3>
      
      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full p-3 border border-gray-300 rounded-lg resize-none"
          rows={3}
        />
        <button
          type="submit"
          disabled={!newComment.trim() || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          Add Comment
        </button>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onUpdate={updateComment}
            onDelete={deleteComment}
            onReply={(content) => createComment(content, comment.id)}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
        >
          {loading ? 'Loading...' : 'Load More Comments'}
        </button>
      )}
    </div>
  );
}
```

## Notes for Frontend Implementation

1. **Authentication**: All requests require authentication. Make sure your API client includes the JWT token.

2. **Error Handling**: Implement proper error handling for all API calls, especially for permission-related errors.

3. **Real-time Updates**: Consider implementing WebSocket connections for real-time comment/like updates if needed.

4. **Optimistic Updates**: For better UX, consider optimistic updates for likes (update UI immediately, revert on error).

5. **Caching**: Implement proper caching strategies for comments and like counts to reduce API calls.

6. **Accessibility**: Ensure all interactive elements have proper ARIA labels and keyboard navigation support.

7. **Performance**: For large comment threads, consider implementing virtual scrolling or tree shaking for nested comments.
