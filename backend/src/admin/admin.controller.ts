import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles([Role.ADMIN])
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/overview')
  @ApiOperation({
    summary: 'Get admin dashboard overview',
    description: 'Get key metrics and statistics for the admin dashboard',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard overview retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Dashboard overview retrieved successfully',
        data: {
          totalUsers: 1250,
          totalRecipes: 3420,
          totalComments: 8900,
          totalLikes: 15600,
          newUsersToday: 23,
          newRecipesToday: 45,
          topRecipes: [],
          recentActivity: [],
        },
      },
    },
  })
  async getDashboardOverview() {
    return this.adminService.getDashboardOverview();
  }

  @Get('analytics/users')
  @ApiOperation({
    summary: 'Get user analytics',
    description: 'Get detailed user statistics and trends',
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['7d', '30d', '90d', '1y'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User analytics retrieved successfully',
  })
  async getUserAnalytics(@Query('timeRange') timeRange: string = '30d') {
    return this.adminService.getUserAnalytics(timeRange);
  }

  @Get('analytics/recipes')
  @ApiOperation({
    summary: 'Get recipe analytics',
    description: 'Get detailed recipe statistics including AI vs manual creation',
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['7d', '30d', '90d', '1y'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recipe analytics retrieved successfully',
  })
  async getRecipeAnalytics(@Query('timeRange') timeRange: string = '30d') {
    return this.adminService.getRecipeAnalytics(timeRange);
  }

  @Get('analytics/engagement')
  @ApiOperation({
    summary: 'Get engagement analytics',
    description: 'Get likes, comments, and saves analytics',
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['7d', '30d', '90d', '1y'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Engagement analytics retrieved successfully',
  })
  async getEngagementAnalytics(@Query('timeRange') timeRange: string = '30d') {
    return this.adminService.getEngagementAnalytics(timeRange);
  }

  @Get('recipes/trending')
  @ApiOperation({
    summary: 'Get trending recipes',
    description: 'Get recipes with most engagement in specified time period',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['7d', '30d', '90d'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trending recipes retrieved successfully',
  })
  async getTrendingRecipes(
    @Query('limit') limit: number = 10,
    @Query('timeRange') timeRange: string = '30d',
  ) {
    return this.adminService.getTrendingRecipes(limit, timeRange);
  }

  @Get('users')
  @ApiOperation({
    summary: 'Get all users with pagination',
    description: 'Get list of all users for admin management',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: ['GUEST', 'MEMBER', 'ADMIN'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
  })
  async getUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('role') role?: Role,
  ) {
    return this.adminService.getUsers({ page, limit, search, role });
  }

  @Patch('users/:id/role')
  @ApiOperation({
    summary: 'Update user role',
    description: 'Change user role (GUEST, MEMBER, ADMIN)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User role updated successfully',
  })
  async updateUserRole(
    @Param('id') userId: string,
    @Body() body: { role: Role },
  ) {
    return this.adminService.updateUserRole(userId, body.role);
  }

  @Delete('users/:id')
  @ApiOperation({
    summary: 'Delete user account',
    description: 'Permanently delete a user account (soft delete)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User deleted successfully',
  })
  async deleteUser(@Param('id') userId: string) {
    return this.adminService.deleteUser(userId);
  }

  @Get('recipes/flagged')
  @ApiOperation({
    summary: 'Get flagged recipes for review',
    description: 'Get recipes that have been reported or need admin review',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flagged recipes retrieved successfully',
  })
  async getFlaggedRecipes(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.adminService.getFlaggedRecipes({ page, limit });
  }

  @Post('recipes/:id/approve')
  @ApiOperation({
    summary: 'Approve a recipe',
    description: 'Approve a recipe that was flagged for review',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recipe approved successfully',
  })
  async approveRecipe(@Param('id') recipeId: string) {
    return this.adminService.approveRecipe(recipeId);
  }

  @Delete('recipes/:id')
  @ApiOperation({
    summary: 'Delete recipe as admin',
    description: 'Delete any recipe (admin override)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recipe deleted successfully',
  })
  async deleteRecipe(@Param('id') recipeId: string) {
    return this.adminService.deleteRecipe(recipeId);
  }

  @Get('comments/flagged')
  @ApiOperation({
    summary: 'Get flagged comments for review',
    description: 'Get comments that have been reported for inappropriate content',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flagged comments retrieved successfully',
  })
  async getFlaggedComments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.adminService.getFlaggedComments({ page, limit });
  }

  @Delete('comments/:id')
  @ApiOperation({
    summary: 'Delete comment as admin',
    description: 'Delete any comment (admin override)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment deleted successfully',
  })
  async deleteComment(@Param('id') commentId: string) {
    return this.adminService.deleteComment(commentId);
  }

  @Get('system/health')
  @ApiOperation({
    summary: 'Get system health metrics',
    description: 'Get system performance and health indicators',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System health retrieved successfully',
  })
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }
}
