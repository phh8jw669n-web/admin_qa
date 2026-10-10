import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Instruction } from './entities/instruction.entity';
import { InstructionLanguagesModule } from './instruction-languages/instruction-languages.module';
import { InstructionsController } from './instructions.controller';
import { InstructionsService } from './instructions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Instruction]),
    InstructionLanguagesModule,
  ],
  controllers: [InstructionsController],
  providers: [InstructionsService],
  exports: [InstructionsService],
})
export class InstructionsModule {}
