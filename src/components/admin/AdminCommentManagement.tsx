import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageCircle,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Flag,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  User,
  ChefHat,
  Reply,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';

interface Comment {
  id: string;
  content: string;
  author: {
    firstName: string;
    lastName: string;
    email: string;
  };
  recipe: {
    id: string;
    title: string;
  };
  parentId?: string;
  parent?: {
    id: string;
    content: string;
    author: {
      firstName: string;
      lastName: string;
    };
  };
  isFlagged: boolean;
  flagReason?: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    replies: number;
  };
}

export const AdminCommentManagement: React.FC = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all'); // all, parent, reply
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);

  const limit = 20;

  const { data: commentsData, isLoading } = useQuery({
    queryKey: ['admin-comments', page, search, statusFilter, typeFilter, flaggedOnly],
    queryFn: () => apiClient.getAdminFlaggedComments({
      page,
      limit,
      search: search || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      flagged: flaggedOnly,
    }),
    enabled: isAdmin(),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => apiClient.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-comments'] });
      toast({
        title: 'Success',
        description: 'Comment deleted successfully',
      });
      setShowDeleteDialog(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete comment',
        variant: 'destructive',
      });
    },
  });

  const unflagCommentMutation = useMutation({
    mutationFn: (commentId: string) => apiClient.unflagComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-comments'] });
      toast({
        title: 'Success',
        description: 'Comment unflagged successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to unflag comment',
        variant: 'destructive',
      });
    },
  });

  if (!isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="h-24 w-24 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access comment management.</p>
        </div>
      </div>
    );
  }

  const comments = commentsData?.data?.data as Comment[] | undefined;
  const meta = commentsData?.data?.meta;

  const getStatusBadge = (comment: Comment) => {
    if (comment.isFlagged) {
      return <Badge className="bg-red-100 text-red-800">Flagged</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  const getTypeBadge = (comment: Comment) => {
    if (comment.parentId) {
      return <Badge variant="outline" className="text-blue-600">Reply</Badge>;
    }
    return <Badge variant="outline" className="text-gray-600">Comment</Badge>;
  };

  const handleDeleteComment = (commentId: string) => {
    setShowDeleteDialog(commentId);
  };

  const handleUnflagComment = (commentId: string) => {
    unflagCommentMutation.mutate(commentId);
  };

  const handleViewComment = (comment: Comment) => {
    setSelectedComment(comment);
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Comment Management</h1>
          <p className="text-gray-600">Manage comment flags, moderation, and removal</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search comments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="parent">Comments</SelectItem>
                <SelectItem value="reply">Replies</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="flagged-only"
                checked={flaggedOnly}
                onChange={(e) => setFlaggedOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="flagged-only" className="text-sm font-medium">
                Flagged Only
              </label>
            </div>

            <Button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setTypeFilter('all');
                setFlaggedOnly(false);
                setPage(1);
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comments
            {meta && (
              <span className="text-sm font-normal text-gray-500">
                ({meta.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : comments && comments.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comment</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Recipe</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comments.map((comment) => (
                    <TableRow key={comment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm mb-1">
                            {truncateContent(comment.content)}
                          </div>
                          {comment.parent && (
                            <div className="text-xs text-gray-500 pl-4 border-l-2 border-gray-200">
                              <span className="font-medium">Reply to:</span>{' '}
                              {truncateContent(comment.parent.content, 50)}
                              <br />
                              <span className="text-gray-400">
                                by {comment.parent.author.firstName} {comment.parent.author.lastName}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {comment.author.firstName} {comment.author.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{comment.author.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{comment.recipe.title}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(comment)}
                        {comment._count.replies > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {comment._count.replies} replies
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(comment)}
                        {comment.isFlagged && comment.flagReason && (
                          <div className="text-xs text-red-600 mt-1">
                            Reason: {comment.flagReason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewComment(comment)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>

                            {comment.isFlagged && (
                              <DropdownMenuItem
                                onClick={() => handleUnflagComment(comment.id)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Unflag Comment
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Comment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-gray-600">
                    Showing {((meta.page - 1) * meta.limit) + 1} to{' '}
                    {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} comments
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.page === 1}
                      onClick={() => setPage(meta.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.page === meta.totalPages}
                      onClick={() => setPage(meta.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No comments found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comment Details Modal */}
      <Dialog open={selectedComment !== null} onOpenChange={() => setSelectedComment(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedComment && (
            <>
              <DialogHeader>
                <DialogTitle>Comment Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Author</h4>
                    <p className="text-sm">
                      {selectedComment.author.firstName} {selectedComment.author.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{selectedComment.author.email}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Recipe</h4>
                    <p className="text-sm">{selectedComment.recipe.title}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Type</h4>
                    {getTypeBadge(selectedComment)}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Status</h4>
                    {getStatusBadge(selectedComment)}
                  </div>
                </div>

                {selectedComment.parent && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                      <Reply className="h-4 w-4" />
                      Reply to Comment
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">"{selectedComment.parent.content}"</p>
                    <p className="text-xs text-gray-500">
                      by {selectedComment.parent.author.firstName} {selectedComment.parent.author.lastName}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Comment Content</h4>
                  <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                    {selectedComment.content}
                  </p>
                </div>

                {selectedComment.isFlagged && selectedComment.flagReason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-sm text-red-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Flag Reason
                    </h4>
                    <p className="text-sm text-red-700">{selectedComment.flagReason}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <h4 className="font-medium text-gray-700">Created</h4>
                    <p>{new Date(selectedComment.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700">Replies</h4>
                    <p>{selectedComment._count.replies} replies</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div />
                  <div className="flex gap-2">
                    {selectedComment.isFlagged && (
                      <Button
                        size="sm"
                        onClick={() => {
                          handleUnflagComment(selectedComment.id);
                          setSelectedComment(null);
                        }}
                      >
                        Unflag Comment
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        handleDeleteComment(selectedComment.id);
                        setSelectedComment(null);
                      }}
                    >
                      Delete Comment
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={showDeleteDialog !== null}
        onOpenChange={() => setShowDeleteDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action will permanently
              remove the comment and all its replies. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (showDeleteDialog) {
                  deleteCommentMutation.mutate(showDeleteDialog);
                }
              }}
              disabled={deleteCommentMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCommentMutation.isPending ? 'Deleting...' : 'Delete Comment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
