import React, { useState, useEffect } from 'react';
import { useCoreRecipe, type CoreRecipe } from '../hooks/useCoreRecipes';
import { useAuth } from '../contexts/AuthContext';
import { Comment, Like, RecipeInteraction } from '../types';

interface RecipeDetailModalProps {
  recipeId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface CommentItemProps {
  comment: Comment;
  onReply?: (commentId: string, content: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onReply }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReplySubmit = () => {
    if (replyContent.trim() && onReply) {
      onReply(comment.id, replyContent);
      setReplyContent('');
      setIsReplying(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="flex space-x-3">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
          {comment.authorName.charAt(0).toUpperCase()}
        </div>
      </div>
      
      {/* Comment content */}
      <div className="flex-1">
        <div className="bg-gray-100 rounded-lg px-3 py-2">
          <div className="font-medium text-sm text-gray-900">
            {comment.authorName}
          </div>
          <div className="text-gray-800 text-sm mt-1">
            {comment.content}
          </div>
        </div>
        
        {/* Comment actions */}
        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
          <span>{formatDate(comment.createdAt)}</span>
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="hover:text-blue-600 font-medium"
          >
            Trả lời
          </button>
        </div>
        
        {/* Reply form */}
        {isReplying && (
          <div className="mt-2 flex space-x-2">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Viết trả lời..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleReplySubmit()}
            />
            <button
              onClick={handleReplySubmit}
              disabled={!replyContent.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700 disabled:bg-gray-300"
            >
              Gửi
            </button>
          </div>
        )}
        
        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} onReply={onReply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipeId,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { data: recipeResponse, isLoading, error } = useCoreRecipe(recipeId);
  const [newComment, setNewComment] = useState('');
  const [interaction, setInteraction] = useState<RecipeInteraction>({
    likes: [],
    comments: [],
    likeCount: 0,
    commentCount: 0,
    isLikedByCurrentUser: false,
  });

  const recipe = recipeResponse?.data;

  // Mock data - trong thực tế sẽ fetch từ API
  useEffect(() => {
    if (recipe && user) {
      // Mock interaction data
      setInteraction({
        likes: [
          {
            id: '1',
            userId: 'user1',
            userName: 'Nguyễn Văn A',
            recipeId: recipe.id,
            createdAt: new Date().toISOString(),
          },
        ],
        comments: [
          {
            id: '1',
            content: 'Công thức này rất hay! Tôi đã thử làm và rất ngon.',
            authorId: 'user1',
            authorName: 'Nguyễn Văn A',
            recipeId: recipe.id,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            replies: [
              {
                id: '2',
                content: 'Cảm ơn bạn đã chia sẻ!',
                authorId: user.id,
                authorName: user.name || 'Bạn',
                recipeId: recipe.id,
                parentId: '1',
                createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
                updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
              },
            ],
          },
        ],
        likeCount: 1,
        commentCount: 2,
        isLikedByCurrentUser: false,
      });
    }
  }, [recipe, user]);

  const handleLike = async () => {
    if (!user || !recipe) return;
    
    // Mock like toggle
    setInteraction(prev => ({
      ...prev,
      isLikedByCurrentUser: !prev.isLikedByCurrentUser,
      likeCount: prev.isLikedByCurrentUser ? prev.likeCount - 1 : prev.likeCount + 1,
    }));
    
    // TODO: API call to toggle like
    console.log('Toggle like for recipe:', recipe.id);
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim() || !user || !recipe) return;
    
    const comment: Comment = {
      id: Date.now().toString(), // Mock ID
      content: newComment,
      authorId: user.id,
      authorName: user.name || 'Bạn',
      recipeId: recipe.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setInteraction(prev => ({
      ...prev,
      comments: [comment, ...prev.comments],
      commentCount: prev.commentCount + 1,
    }));
    
    setNewComment('');
    
    // TODO: API call to add comment
    console.log('Add comment to recipe:', recipe.id, comment);
  };

  const handleReply = async (parentCommentId: string, content: string) => {
    if (!user || !recipe) return;
    
    // TODO: API call to add reply
    console.log('Add reply to comment:', parentCommentId, content);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {recipe?.title || 'Chi tiết công thức'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : error || !recipe ? (
            <div className="p-6 text-center text-red-600">
              <p>Không thể tải thông tin công thức. Vui lòng thử lại.</p>
            </div>
          ) : (
            <div className="p-6">
              {/* Recipe info */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {recipe.title}
                </h1>
                {recipe.description && (
                  <p className="text-gray-600 mb-4">{recipe.description}</p>
                )}
                <div className="text-sm text-gray-500 mb-4">
                  Tạo: {formatDate(recipe.createdAt)}
                </div>
              </div>

              {/* Ingredients */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Nguyên liệu ({recipe.ingredients.length})
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    {recipe.ingredients.map((ingredient) => (
                      <div
                        key={ingredient.id}
                        className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0"
                      >
                        <span className="font-medium text-gray-900">
                          {ingredient.ingredient.name}
                        </span>
                        <span className="text-gray-600">
                          {ingredient.quantity} {ingredient.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Steps - hiển thị rõ ràng không hash */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Các bước thực hiện ({recipe.steps.length} bước)
                </h3>
                <div className="space-y-4">
                  {recipe.steps.map((step, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 bg-blue-50 rounded-lg p-4">
                        <p className="text-gray-900 leading-relaxed">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nutrition */}
              {recipe.nutrition && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Thông tin dinh dưỡng
                  </h3>
                  <div className="bg-green-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {recipe.nutrition.calories && (
                      <div className="text-center">
                        <div className="font-semibold text-green-800">{recipe.nutrition.calories}</div>
                        <div className="text-sm text-green-600">Calories</div>
                      </div>
                    )}
                    {recipe.nutrition.protein && (
                      <div className="text-center">
                        <div className="font-semibold text-green-800">{recipe.nutrition.protein}g</div>
                        <div className="text-sm text-green-600">Protein</div>
                      </div>
                    )}
                    {recipe.nutrition.fat && (
                      <div className="text-center">
                        <div className="font-semibold text-green-800">{recipe.nutrition.fat}g</div>
                        <div className="text-sm text-green-600">Fat</div>
                      </div>
                    )}
                    {recipe.nutrition.carbs && (
                      <div className="text-center">
                        <div className="font-semibold text-green-800">{recipe.nutrition.carbs}g</div>
                        <div className="text-sm text-green-600">Carbs</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Like and Comment section - giống Facebook */}
              <div className="border-t border-gray-200 pt-6">
                {/* Stats */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{interaction.likeCount} lượt thích</span>
                    <span>{interaction.commentCount} bình luận</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between py-3 border-t border-b border-gray-200 mb-4">
                  <button
                    onClick={handleLike}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                      interaction.isLikedByCurrentUser
                        ? 'text-blue-600'
                        : 'text-gray-600'
                    }`}
                  >
                    <svg className="w-5 h-5" fill={interaction.isLikedByCurrentUser ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 6v4m7 0h1M9 10v10m0-10h1" />
                    </svg>
                    <span>Thích</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.001 8.001 0 01-7.999-8c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                    </svg>
                    <span>Bình luận</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span>Chia sẻ</span>
                  </button>
                </div>

                {/* Add comment */}
                {user && (
                  <div className="flex space-x-3 mb-6">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Viết bình luận..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500"
                          onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
                        />
                        <button
                          onClick={handleCommentSubmit}
                          disabled={!newComment.trim()}
                          className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300"
                        >
                          Đăng
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comments list */}
                <div className="space-y-4">
                  {interaction.comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      onReply={handleReply}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
