import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { NULL_CHARACTER_MESSAGE } from '../constants/validation.constants';
import { apiError } from '../utils/api-response.util';

type PostgresDriverError = {
  code?: string;
  constraint?: string;
  detail?: string;
  message?: string;
};

const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  UQ_companies_workspace_url: 'This workspace URL is already in use',
  UQ_companies_company_code: 'This company code is already in use',
  UQ_companies_email: 'This email is already in use',
  UQ_companies_gst_no: 'This GST number is already in use',
  UQ_languages_company_id_name: 'A language with this name already exists',
  UQ_admins_company_id_email: 'This email is already in use for this company',
  UQ_admins_email_super_admin: 'This email is already in use',
  UQ_groups_company_id_name: 'A group with this name already exists',
  UQ_instructions_company_id_name:
    'An instruction with this name already exists',
  UQ_instruction_languages_instruction_id_language_id:
    'This language already has content for this instruction',
  UQ_subjects_company_id_name_language_id:
    'A subject with this name already exists for the selected language',
  UQ_subjects_company_id_name_no_language:
    'A subject with this name already exists',
  UQ_categories_company_id_name_language_id:
    'A category with this name already exists for the selected language',
  UQ_categories_company_id_name_no_language:
    'A category with this name already exists',
  UQ_topics_company_id_name_language_id:
    'A topic with this name already exists for the selected language',
  UQ_topics_company_id_name_no_language:
    'A topic with this name already exists',
  UQ_cst_mappings_company_category_subject_topic:
    'This category, subject, and topic mapping already exists',
  UQ_candidates_company_id_email:
    'This email is already in use for this company',
  UQ_candidates_company_id_enrollment_number:
    'This enrollment number is already in use for this company',
  UQ_candidate_documents_candidate_id_document_type:
    'This document type already exists for the candidate',
  UQ_feedbacks_company_id_student_id_test_id:
    'You have already submitted feedback for this test',
  UQ_events_company_id_event_code:
    'This event code is already in use for this company',
  UQ_zones_company_id_name: 'A zone with this name already exists',
  UQ_regions_company_id_zone_id_name:
    'A region with this name already exists in this zone',
  UQ_centres_company_id_code:
    'This centre code is already in use for this company',
  UQ_centres_company_id_region_id_name:
    'A centre with this name already exists in this region',
  UQ_centre_users_company_id_email:
    'This email is already in use for this company',
  UQ_labs_company_id_centre_id_name:
    'A lab with this name already exists in this centre',
  UQ_templates_ranking: 'This template ranking is already in use',
  UQ_difficulties_company_id_name_language_id:
    'A difficulty with this name already exists for the selected language',
  UQ_tests_company_id_test_code:
    'This test code is already in use for this company',
  UQ_sessions_company_id_code:
    'This session code is already in use for this company',
  UQ_test_candidate_mappings_company_test_candidate_attempt:
    'This candidate already has this attempt number for the selected test',
  UQ_candidate_centre_mappings_company_candidate_centre_date:
    'This candidate is already mapped to this centre on this date',
  UQ_test_settings_test_id: 'Test settings already exist for this test',
  UQ_question_content_question_id_language_id:
    'This language already has content for this question',
};

const UNIQUE_COLUMN_MESSAGES: Record<string, string> = {
  workspace_url: 'This workspace URL is already in use',
  company_code: 'This company code is already in use',
  email: 'This email is already in use',
  gst_no: 'This GST number is already in use',
  name: 'This name is already in use',
  event_code: 'This event code is already in use for this company',
  code: 'This centre code is already in use for this company',
};

@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter {
  private readonly logger = new Logger(QueryFailedFilter.name);

  catch(exception: QueryFailedError, _host: ArgumentsHost): never {
    const driverError = exception.driverError as
      PostgresDriverError | undefined;
    const code = driverError?.code;

    if (code === '23505') {
      throw new ConflictException(apiError(this.uniqueMessage(driverError)));
    }

    if (code === '22001') {
      throw new BadRequestException(apiError('This value is too long'));
    }

    if (this.isNullCharacterError(code, exception.message, driverError)) {
      throw new BadRequestException(apiError(NULL_CHARACTER_MESSAGE));
    }

    this.logger.error(exception.message, exception.stack);

    throw new InternalServerErrorException(
      apiError('Something went wrong. Please try again.'),
    );
  }

  private uniqueMessage(driverError?: PostgresDriverError): string {
    const constraint = driverError?.constraint;
    if (constraint && UNIQUE_CONSTRAINT_MESSAGES[constraint]) {
      return UNIQUE_CONSTRAINT_MESSAGES[constraint];
    }

    const column = driverError?.detail?.match(/Key \(([^)]+)\)/)?.[1];
    if (column && UNIQUE_COLUMN_MESSAGES[column]) {
      return UNIQUE_COLUMN_MESSAGES[column];
    }

    return 'This record already exists';
  }

  private isNullCharacterError(
    code: string | undefined,
    exceptionMessage: string,
    driverError?: PostgresDriverError,
  ): boolean {
    if (code === '22021' || code === '22P05') {
      return true;
    }

    const message =
      `${exceptionMessage} ${driverError?.message ?? ''}`.toLowerCase();

    return message.includes('0x00') || message.includes('null character');
  }
}
