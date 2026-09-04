import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public() // health-check route -> ไม่ต้อง login ก็เรียกได้
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
