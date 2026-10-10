import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LanguagesModule } from '../../languages/languages.module';
import { Test } from '../../tests/entities/test.entity';
import { Instruction } from '../entities/instruction.entity';
import { InstructionLanguage } from './entities/instruction-language.entity';
import { InstructionLanguagesController } from './instruction-languages.controller';
import { InstructionLanguagesService } from './instruction-languages.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InstructionLanguage, Instruction, Test]),
    LanguagesModule,
  ],
  controllers: [InstructionLanguagesController],
  providers: [InstructionLanguagesService],
})
export class InstructionLanguagesModule {}
