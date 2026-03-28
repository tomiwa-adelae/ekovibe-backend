import { SetMetadata } from '@nestjs/common';

export const MODULE_KEY = 'required_module';
export const RequireModule = (module: string) => SetMetadata(MODULE_KEY, module);
