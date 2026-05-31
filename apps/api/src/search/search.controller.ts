import { Controller, Post, Body } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';
import { SearchResult } from './search.types';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @ApiOperation({ summary: 'Search for documents' })
  @ApiOkResponse({ description: 'Search result' })
  search(@Body() dto: SearchDto): Promise<SearchResult> {
    return this.searchService.search(dto.query, dto.documentId, dto.topK);
  }
}
