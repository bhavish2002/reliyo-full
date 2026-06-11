import { Controller, Get } from '@nestjs/common';
import { PaymentsConfigService } from './payments-config.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsConfig: PaymentsConfigService) {}

  /** Public checkout configuration (Razorpay key id is publishable). */
  @Get('config')
  getConfig() {
    return this.paymentsConfig.getConfig();
  }
}
