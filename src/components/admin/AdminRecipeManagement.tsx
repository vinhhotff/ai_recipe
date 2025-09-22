import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChefHat,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Flag,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  Calendar,
  User,
  Heart,
  MessageCircle,
  Bookmark,
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

interface Recipe {
  id: string;
  title: string;
  description: string;
  author: {
    firstName: string;
    lastName: string;
    email: string;
  };
  cuisine: string;
  difficulty: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  imageUrl?: string;
  isApproved: boolean;
  isFlagged: boolean;
  flagReason?: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    likes: number;
    comments: number;
    saves: number;
  };
}

export const AdminRecipeManagement: React.FC = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cuisineFilter, setCuisineFilter] = useState<string>('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const limit = 20;

  const { data: recipesData, isLoading } = useQuery({
    queryKey: ['admin-recipes', page, search, statusFilter, cuisineFilter, flaggedOnly],
    queryFn: () => apiClient.getAdminFlaggedRecipes({
      page,
      limit,
      search: search || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      cuisine: cuisineFilter !== 'all' ? cuisineFilter : undefined,
      flagged: flaggedOnly,
    }),
    enabled: isAdmin(),
  });

  const approveRecipeMutation = useMutation({
    mutationFn: (recipeId: string) => apiClient.approveRecipe(recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-recipes'] });
      toast({
        title: 'Success',
        description: 'Recipe approved successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve recipe',
        variant: 'destructive',
      });
    },
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: (recipeId: string) => apiClient.deleteRecipe(recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-recipes'] });
      toast({
        title: 'Success',
        description: 'Recipe deleted successfully',
      });
      setShowDeleteDialog(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete recipe',
        variant: 'destructive',
      });
    },
  });

  if (!isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="h-24 w-24 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access recipe management.</p>
        </div>
      </div>
    );
  }

  const recipes = recipesData?.data?.data as Recipe[] | undefined;
  const meta = recipesData?.data?.meta;

  const getStatusBadge = (recipe: Recipe) => {
    if (recipe.isFlagged) {
      return <Badge className="bg-red-100 text-red-800">Flagged</Badge>;
    }
    if (!recipe.isApproved) {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
  };

  const handleApproveRecipe = (recipeId: string) => {
    approveRecipeMutation.mutate(recipeId);
  };

  const handleDeleteRecipe = (recipeId: string) => {
    setShowDeleteDialog(recipeId);
  };

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recipe Management</h1>
          <p className="text-gray-600">Manage recipe approvals, flags, and moderation</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search recipes..."
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
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by cuisine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cuisines</SelectItem>
                <SelectItem value="Italian">Italian</SelectItem>
                <SelectItem value="Chinese">Chinese</SelectItem>
                <SelectItem value="Indian">Indian</SelectItem>
                <SelectItem value="Mexican">Mexican</SelectItem>
                <SelectItem value="French">French</SelectItem>
                <SelectItem value="Thai">Thai</SelectItem>
                <SelectItem value="Japanese">Japanese</SelectItem>
                <SelectItem value="American">American</SelectItem>
                <SelectItem value="Mediterranean">Mediterranean</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
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
                setCuisineFilter('all');
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

      {/* Recipes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Recipes
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
          ) : recipes && recipes.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipe</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cuisine</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {recipe.imageUrl && (
                            <img
                              src={recipe.imageUrl}
                              alt={recipe.title}
                              className="h-10 w-10 rounded object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium">{recipe.title}</div>
                            <div className="text-sm text-gray-500 line-clamp-1">
                              {recipe.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {recipe.author.firstName} {recipe.author.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{recipe.author.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(recipe)}
                        {recipe.isFlagged && recipe.flagReason && (
                          <div className="text-xs text-red-600 mt-1">
                            Reason: {recipe.flagReason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{recipe.cuisine}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {recipe._count.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {recipe._count.comments}
                          </span>
                          <span className="flex items-center gap-1">
                            <Bookmark className="h-3 w-3" />
                            {recipe._count.saves}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(recipe.createdAt).toLocaleDateString()}
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
                            <DropdownMenuItem onClick={() => handleViewRecipe(recipe)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>

                            {!recipe.isApproved && (
                              <DropdownMenuItem
                                onClick={() => handleApproveRecipe(recipe.id)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve Recipe
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleDeleteRecipe(recipe.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Recipe
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
                    {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} recipes
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
              <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No recipes found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recipe Details Modal */}
      <Dialog open={selectedRecipe !== null} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedRecipe && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRecipe.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedRecipe.imageUrl && (
                  <img
                    src={selectedRecipe.imageUrl}
                    alt={selectedRecipe.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Author</h4>
                    <p className="text-sm">
                      {selectedRecipe.author.firstName} {selectedRecipe.author.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{selectedRecipe.author.email}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Status</h4>
                    {getStatusBadge(selectedRecipe)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Cuisine</h4>
                    <p className="text-sm">{selectedRecipe.cuisine}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Difficulty</h4>
                    <p className="text-sm capitalize">{selectedRecipe.difficulty}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Servings</h4>
                    <p className="text-sm">{selectedRecipe.servings}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Prep Time</h4>
                    <p className="text-sm">{selectedRecipe.prepTime} minutes</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Cook Time</h4>
                    <p className="text-sm">{selectedRecipe.cookTime} minutes</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{selectedRecipe.description}</p>
                </div>

                {selectedRecipe.isFlagged && selectedRecipe.flagReason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-sm text-red-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Flag Reason
                    </h4>
                    <p className="text-sm text-red-700">{selectedRecipe.flagReason}</p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex space-x-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      {selectedRecipe._count.likes} likes
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      {selectedRecipe._count.comments} comments
                    </span>
                    <span className="flex items-center gap-1">
                      <Bookmark className="h-4 w-4" />
                      {selectedRecipe._count.saves} saves
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {!selectedRecipe.isApproved && (
                      <Button
                        size="sm"
                        onClick={() => {
                          handleApproveRecipe(selectedRecipe.id);
                          setSelectedRecipe(null);
                        }}
                      >
                        Approve Recipe
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        handleDeleteRecipe(selectedRecipe.id);
                        setSelectedRecipe(null);
                      }}
                    >
                      Delete Recipe
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
            <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recipe? This action will permanently
              remove the recipe and all associated data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (showDeleteDialog) {
                  deleteRecipeMutation.mutate(showDeleteDialog);
                }
              }}
              disabled={deleteRecipeMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteRecipeMutation.isPending ? 'Deleting...' : 'Delete Recipe'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
