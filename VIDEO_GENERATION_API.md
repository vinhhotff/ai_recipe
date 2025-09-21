# Video Generation API Documentation

## Overview

The Video Generation module allows users to create instructional cooking videos from recipe data. The system uses AI/ML processing to generate engaging video tutorials with narration, background music, and various visual styles.

## API Endpoints

### 1. Generate Recipe Video

**POST** `/api/videos/generate`

Generate a video tutorial for a recipe.

#### Request Body
```json
{
  "recipeId": "uuid-recipe-123",
  "style": "step-by-step",
  "narration": true,
  "voice": "female-vietnamese",
  "resolution": "720p",
  "maxDuration": 120,
  "backgroundMusic": true,
  "musicGenre": "cooking"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Video generation initiated successfully",
  "data": {
    "recipeVideoId": "uuid-video-456",
    "recipeId": "uuid-recipe-123",
    "status": "pending",
    "style": "step-by-step",
    "narration": true,
    "voice": "female-vietnamese",
    "resolution": "720p",
    "createdAt": "2024-01-20T10:30:00Z",
    "updatedAt": "2024-01-20T10:30:00Z"
  }
}
```

### 2. Get Video Status

**GET** `/api/videos/:videoId`

Check the status of a video generation request.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Video status retrieved successfully",
  "data": {
    "id": "uuid-video-456",
    "recipeId": "uuid-recipe-123",
    "status": "done",
    "progress": 100,
    "videoUrl": "https://cdn.recipe-videos.com/videos/uuid-video-456.mp4",
    "thumbnailUrl": "https://cdn.recipe-videos.com/thumbnails/uuid-video-456.jpg",
    "duration": 85,
    "resolution": "720p",
    "fileSize": 15728640,
    "createdAt": "2024-01-20T10:30:00Z",
    "updatedAt": "2024-01-20T10:35:00Z",
    "processingTimeMs": 45000
  }
}
```

### 3. Get Recipe Videos

**GET** `/api/videos/recipe/:recipeId?userOnly=true`

Retrieve all videos generated for a specific recipe.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Recipe videos retrieved successfully",
  "data": [
    {
      "id": "uuid-video-456",
      "recipeId": "uuid-recipe-123",
      "recipeTitle": "Trứng chiên cà chua",
      "status": "done",
      "thumbnailUrl": "https://cdn.recipe-videos.com/thumbnails/uuid-video-456.jpg",
      "duration": 85,
      "resolution": "720p",
      "style": "step-by-step",
      "narration": true,
      "createdAt": "2024-01-20T10:30:00Z"
    }
  ]
}
```

### 4. Get User Video Statistics

**GET** `/api/videos/stats/user`

Get video generation statistics for the authenticated user.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Video generation statistics retrieved successfully",
  "data": {
    "totalGenerated": 25,
    "successful": 23,
    "failed": 2,
    "processing": 3,
    "avgProcessingTimeSeconds": 45.5,
    "successRate": 92.0
  }
}
```

## Video Generation Options

### Video Styles
- `step-by-step`: Traditional step-by-step cooking tutorial
- `timelapse`: Fast-paced timelapse cooking
- `split-screen`: Side-by-side ingredient prep and cooking
- `top-down`: Overhead view of cooking process
- `professional`: High-quality professional style

### Voice Types
- `female-vietnamese`: Vietnamese female narrator
- `male-vietnamese`: Vietnamese male narrator
- `female-english`: English female narrator
- `male-english`: English male narrator
- `robot`: Synthetic robot voice
- `none`: No narration

### Resolutions
- `480p`: Standard definition (480p)
- `720p`: High definition (720p) - Default
- `1080p`: Full HD (1080p)
- `4k`: Ultra HD (4K)

## Video Processing Flow

1. **Request Submission**: User submits video generation request
2. **Validation**: System validates recipe exists and user has access
3. **Queue Job**: Video generation job is queued for processing
4. **Processing**: AI system generates video based on recipe data and options
5. **Upload**: Generated video is uploaded to CDN
6. **Completion**: Video URL and metadata are updated in database

## Status Values

- `pending`: Video generation is queued
- `processing`: Video is currently being generated
- `done`: Video generation completed successfully
- `failed`: Video generation failed

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "recipeId": "Recipe ID is required"
  }
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Recipe not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Video generation failed: processing timeout"
}
```

## Frontend Integration Example

```typescript
import { useGenerateRecipeVideo, useVideoStatus } from '../hooks/useRecipeVideo';

function RecipeVideoComponent({ recipeId }: { recipeId: string }) {
  const { mutate: generateVideo, isPending } = useGenerateRecipeVideo();
  const [videoId, setVideoId] = useState<string | null>(null);
  const { data: videoStatus } = useVideoStatus(videoId || '', !!videoId);

  const handleGenerate = () => {
    generateVideo({
      recipeId,
      style: 'step-by-step',
      narration: true,
      voice: 'female-vietnamese',
      resolution: '720p'
    }, {
      onSuccess: (data) => {
        setVideoId(data.recipeVideoId);
      }
    });
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isPending}>
        {isPending ? 'Generating...' : 'Generate Video'}
      </button>
      
      {videoStatus && (
        <div>
          <p>Status: {videoStatus.status}</p>
          {videoStatus.videoUrl && (
            <video src={videoStatus.videoUrl} controls />
          )}
        </div>
      )}
    </div>
  );
}
```

## Rate Limits and Quotas

- **Free Tier**: 5 videos per day, 720p max resolution
- **Premium Tier**: 50 videos per day, 4K resolution
- **Enterprise**: Unlimited videos, custom processing

## File Storage

Videos are stored on a CDN with the following structure:
- **Videos**: `https://cdn.recipe-videos.com/videos/{videoId}.mp4`
- **Thumbnails**: `https://cdn.recipe-videos.com/thumbnails/{videoId}.jpg`
- **Storage Duration**: 1 year for free accounts, permanent for premium

## Performance Metrics

- **Average Processing Time**: 30-60 seconds per video
- **Success Rate**: 95%+ for valid recipes
- **Supported Video Formats**: MP4 (H.264)
- **Audio Formats**: AAC, 128kbps
- **Maximum Video Length**: 5 minutes

## Authentication

All endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

## Webhooks (Future Feature)

Webhook endpoints for video processing completion:

```json
{
  "event": "video.completed",
  "videoId": "uuid-video-456",
  "recipeId": "uuid-recipe-123",
  "status": "done",
  "videoUrl": "https://cdn.recipe-videos.com/videos/uuid-video-456.mp4",
  "timestamp": "2024-01-20T10:35:00Z"
}
```
