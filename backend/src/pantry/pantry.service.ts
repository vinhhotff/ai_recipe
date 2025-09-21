import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePantryItemDto } from './dto/create-pantry-item.dto';
import { UpdatePantryItemDto } from './dto/update-pantry-item.dto';

@Injectable()
export class PantryService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  async create(userId: string, createPantryItemDto: CreatePantryItemDto) {
    return this.prisma.pantryItem.create({
      data: {
        ...createPantryItemDto,
        userId,
        normalized: this.normalizeIngredient(createPantryItemDto.name),
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.pantryItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.pantryItem.findFirst({
      where: { id, userId },
    });
  }

  async update(id: string, userId: string, updatePantryItemDto: UpdatePantryItemDto) {
    return this.prisma.pantryItem.update({
      where: { id },
      data: {
        ...updatePantryItemDto,
        normalized: updatePantryItemDto.name 
          ? this.normalizeIngredient(updatePantryItemDto.name)
          : undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.pantryItem.delete({
      where: { id },
    });
  }

  async recognizeIngredients(imageBuffer: Buffer, fileName?: string) {
    try {
      // Save image to Supabase Storage for future reference
      let imageUrl: string | undefined;
      if (fileName) {
        const uploadResult = await this.supabaseService.uploadImage(
          imageBuffer,
          fileName,
          'image/jpeg'
        );
        imageUrl = uploadResult.url;
        console.log('Image saved to Supabase:', imageUrl);
      }

      // Try to use OpenAI Vision API if available
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey) {
        return await this.recognizeWithOpenAI(imageBuffer, imageUrl);
      }
      
      // Fallback to mock data
      return this.getMockRecognition(imageUrl);
    } catch (error) {
      console.error('Image recognition error:', error);
      return this.getMockRecognition();
    }
  }

  private async recognizeWithOpenAI(imageBuffer: Buffer, imageUrl?: string) {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    // This would require OpenAI Vision API integration
    // For now, return enhanced mock data based on common ingredients
    return this.getMockRecognition(imageUrl);
  }

  private getMockRecognition(imageUrl?: string) {
    const commonIngredients = [
      { name: 'Cà chua', confidence: 0.95, normalized: 'tomato' },
      { name: 'Thịt gà', confidence: 0.88, normalized: 'chicken_breast' },
      { name: 'Hành tây', confidence: 0.92, normalized: 'onion' },
      { name: 'Tỏi', confidence: 0.85, normalized: 'garlic' },
      { name: 'Cà rót', confidence: 0.90, normalized: 'carrot' },
      { name: 'Khoai tây', confidence: 0.87, normalized: 'potato' },
    ];

    // Return random 3-5 ingredients
    const shuffled = commonIngredients.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.floor(Math.random() * 3) + 3);

    return {
      recognized: selected,
      possibleQuantities: ['100g', '200g', '300g', '1 quả', '2 quả', '1 củ', '2 củ', '3 tép', '1 kg'],
      imageUrl, // Include the uploaded image URL
    };
  }

  private normalizeIngredient(name: string): string {
    // Simple normalization - in production, use a proper ingredient database
    const normalized = name.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd');

    return normalized;
  }
}