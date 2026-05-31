import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';
import { SearchResult } from './search.types';

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @ApiOperation({ summary: 'Search ingested material for the current user' })
  @ApiOkResponse({ description: 'Search result' })
  search(
    @CurrentUser() user: AuthUser,
    @Body() dto: SearchDto,
  ): Promise<SearchResult> {
    return this.searchService.search(
      user.id,
      dto.query,
      dto.documentId,
      dto.topK,
    );
  }
}
