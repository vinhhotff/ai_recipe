import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Video, 
  Settings, 
  Clock, 
  Users, 
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileVideo,
  Loader2
} from 'lucide-react';
import { 
  useGenerateRecipeVideo, 
  useVideoStatus,
  useRecipeVideos,
  getVideoStatusColor,
  getVideoStatusText,
  formatFileSize,
  formatDuration,
  getVideoStyleText,
  getVoiceTypeText,
  type VideoGenerationRequest 
} from '../hooks/useRecipeVideo';

interface RecipeVideoProps {
  recipeId: string;
  recipeTitle: string;
  onVideoGenerated?: (videoId: string) => void;
}

export const RecipeVideo: React.FC<RecipeVideoProps> = ({
  recipeId,
  recipeTitle,
  onVideoGenerated
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [videoOptions, setVideoOptions] = useState<Omit<VideoGenerationRequest, 'recipeId'>>({
    style: 'step-by-step',
    narration: true,
    voice: 'female-vietnamese',
    resolution: '720p',
    maxDuration: 120,
    backgroundMusic: true,
    musicGenre: 'cooking'
  });

  const { mutate: generateVideo, isPending: isGenerating, error: generateError } = useGenerateRecipeVideo();
  const { data: videos, isLoading: videosLoading, refetch: refetchVideos } = useRecipeVideos(recipeId, true);
  const { data: videoStatus } = useVideoStatus(currentVideoId || '', !!currentVideoId);

  // Auto-select the first video or most recent processing video
  useEffect(() => {
    if (videos && videos.length > 0 && !currentVideoId) {
      // Find processing video first, then completed, then any
      const processingVideo = videos.find(v => v.status === 'processing');
      const completedVideo = videos.find(v => v.status === 'done');
      const selectedVideo = processingVideo || completedVideo || videos[0];
      setCurrentVideoId(selectedVideo.id);
    }
  }, [videos, currentVideoId]);

  const handleGenerateVideo = () => {
    const request: VideoGenerationRequest = {
      recipeId,
      ...videoOptions
    };

    generateVideo(request, {
      onSuccess: (data) => {
        setCurrentVideoId(data.recipeVideoId);
        onVideoGenerated?.(data.recipeVideoId);
        setShowSettings(false);
      }
    });
  };

  const currentVideo = videos?.find(v => v.id === currentVideoId);
  const hasCompletedVideo = currentVideo?.status === 'done';
  const isProcessing = currentVideo?.status === 'processing' || currentVideo?.status === 'pending';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-red-500 to-pink-500 rounded-full">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Video Hướng Dẫn</h3>
            <p className="text-gray-600">Tạo video nấu ăn cho "{recipeTitle}"</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Cài đặt video"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          {!isGenerating && !isProcessing && (
            <button
              onClick={handleGenerateVideo}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-xl hover:from-red-600 hover:to-pink-600 transition-all"
            >
              <Video className="w-4 h-4" />
              <span>Tạo Video</span>
            </button>
          )}
        </div>
      </div>

      {/* Video Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Cài đặt video</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Video Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phong cách video
              </label>
              <select
                value={videoOptions.style}
                onChange={(e) => setVideoOptions(prev => ({ 
                  ...prev, 
                  style: e.target.value as VideoGenerationRequest['style']
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                <option value="step-by-step">Từng bước</option>
                <option value="timelapse">Tua nhanh</option>
                <option value="split-screen">Chia màn hình</option>
                <option value="top-down">Nhìn từ trên</option>
                <option value="professional">Chuyên nghiệp</option>
              </select>
            </div>

            {/* Resolution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chất lượng video
              </label>
              <select
                value={videoOptions.resolution}
                onChange={(e) => setVideoOptions(prev => ({ 
                  ...prev, 
                  resolution: e.target.value as VideoGenerationRequest['resolution']
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                <option value="480p">480p (Tiêu chuẩn)</option>
                <option value="720p">720p (HD)</option>
                <option value="1080p">1080p (Full HD)</option>
                <option value="4k">4K (Ultra HD)</option>
              </select>
            </div>

            {/* Max Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thời lượng tối đa (giây)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={videoOptions.maxDuration}
                onChange={(e) => setVideoOptions(prev => ({ 
                  ...prev, 
                  maxDuration: parseInt(e.target.value) || 120
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Voice Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giọng lồng tiếng
              </label>
              <select
                value={videoOptions.voice}
                onChange={(e) => setVideoOptions(prev => ({ 
                  ...prev, 
                  voice: e.target.value as VideoGenerationRequest['voice']
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                <option value="female-vietnamese">Nữ Tiếng Việt</option>
                <option value="male-vietnamese">Nam Tiếng Việt</option>
                <option value="female-english">Nữ Tiếng Anh</option>
                <option value="male-english">Nam Tiếng Anh</option>
                <option value="robot">Robot</option>
                <option value="none">Không lồng tiếng</option>
              </select>
            </div>

            {/* Narration Toggle */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="narration"
                checked={videoOptions.narration}
                onChange={(e) => setVideoOptions(prev => ({ 
                  ...prev, 
                  narration: e.target.checked
                }))}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="narration" className="text-sm font-medium text-gray-700">
                Kèm lời dẫn
              </label>
            </div>

            {/* Background Music Toggle */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="backgroundMusic"
                checked={videoOptions.backgroundMusic}
                onChange={(e) => setVideoOptions(prev => ({ 
                  ...prev, 
                  backgroundMusic: e.target.checked
                }))}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="backgroundMusic" className="text-sm font-medium text-gray-700">
                Nhạc nền
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Area */}
      <div className="mb-6">
        {hasCompletedVideo && videoStatus?.videoUrl ? (
          <div className="relative bg-black rounded-xl overflow-hidden">
            <video
              controls
              className="w-full h-64 md:h-96 object-cover"
              poster={videoStatus.thumbnailUrl}
            >
              <source src={videoStatus.videoUrl} type="video/mp4" />
              Trình duyệt của bạn không hỗ trợ video.
            </video>
            
            {/* Video Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <div className="flex items-center justify-between text-white text-sm">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(videoStatus.duration)}</span>
                  </span>
                  <span>{videoStatus.resolution}</span>
                  <span>{formatFileSize(videoStatus.fileSize)}</span>
                </div>
                <button
                  onClick={() => window.open(videoStatus.videoUrl, '_blank')}
                  className="flex items-center space-x-1 px-3 py-1 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải xuống</span>
                </button>
              </div>
            </div>
          </div>
        ) : isProcessing ? (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 text-center border border-blue-200">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-blue-900 mb-2">
                  {currentVideo?.status === 'processing' ? 'Đang tạo video...' : 'Video đang chờ xử lý'}
                </h4>
                <p className="text-blue-700 text-sm">
                  {currentVideo?.status === 'processing' 
                    ? 'Video đang được xử lý, vui lòng đợi trong giây lát'
                    : 'Video đã được thêm vào hàng đợi xử lý'
                  }
                </p>
                
                {videoStatus?.progress && (
                  <div className="mt-4 w-full max-w-xs mx-auto">
                    <div className="bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${videoStatus.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 mt-2">{videoStatus.progress}% hoàn thành</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : isGenerating ? (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-8 text-center border border-purple-200">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
              <div>
                <h4 className="text-lg font-semibold text-purple-900">Đang khởi tạo...</h4>
                <p className="text-purple-700 text-sm">Đang chuẩn bị tạo video cho công thức</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-300">
            <div className="flex flex-col items-center space-y-4">
              <FileVideo className="w-16 h-16 text-gray-400" />
              <div>
                <h4 className="text-lg font-semibold text-gray-500">Chưa có video</h4>
                <p className="text-gray-400 text-sm">Nhấn "Tạo Video" để tạo video hướng dẫn nấu ăn</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {generateError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <h5 className="font-semibold text-red-900">Lỗi tạo video</h5>
              <p className="text-red-700 text-sm">{generateError.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Previous Videos List */}
      {videos && videos.length > 0 && (
        <div className="border-t pt-6">
          <h4 className="font-semibold text-gray-900 mb-4">Video đã tạo ({videos.length})</h4>
          
          <div className="space-y-3">
            {videos.map((video) => (
              <div 
                key={video.id}
                className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                  currentVideoId === video.id 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setCurrentVideoId(video.id)}
              >
                <div className="flex items-center space-x-3">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt="Video thumbnail"
                      className="w-16 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <FileVideo className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  
                  <div>
                    <p className="font-medium text-gray-900">
                      {getVideoStyleText(video.style)} • {video.resolution}
                    </p>
                    <div className="flex items-center space-x-3 text-sm text-gray-500">
                      <span className={getVideoStatusColor(video.status)}>
                        {getVideoStatusText(video.status)}
                      </span>
                      {video.duration && (
                        <span>{formatDuration(video.duration)}</span>
                      )}
                      <span>{new Date(video.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {video.status === 'done' && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {video.status === 'processing' && (
                    <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                  {video.status === 'failed' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
