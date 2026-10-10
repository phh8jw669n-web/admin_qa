const testId = '221c95a0-b9d7-47c0-93e9-f69ccf6a98f5';
const subjectId = '3a7a59a4-f1c0-43bc-a9e1-5bc0f4680990';
const topicId = '48360338-b7c0-4c71-ad9b-59aab19c0129';
const languageId = 'f81d17a6-204f-4841-8d29-1a5c881aa709';
const difficultyId = '230ddb40-6309-4056-937e-9c1c5a46f08b';

function base(questionType: string) {
  return { testId, subjectId, topicId, questionType, isActive: true };
}

function content(
  questionType: string,
  questionText: string,
  options: Record<string, unknown> | null,
) {
  return { languageId, difficultyId, questionType, questionText, options };
}

export const createQuestionExamples = {
  singleChoice: {
    summary: 'Single choice',
    description:
      'Required: testId, subjectId, topicId, questionType, questionData. Each language requires languageId, difficultyId, questionType, and options with exactly 1 correct id. questionText, explanation, marks, and isActive are optional. Do not send childQuestions.',
    value: {
      ...base('single_choice'),
      questionData: [
        content('single_choice', 'What is 2 + 2?', {
          options: [
            { id: 'a', text: '3' },
            { id: 'b', text: '4' },
          ],
          correctOptions: ['b'],
        }),
      ],
    },
  },
  multipleChoice: {
    summary: 'Multiple choice',
    description:
      'options.correctOptions must contain at least 2 ids. Each id must exist in options.',
    value: {
      ...base('multiple_choice'),
      questionData: [
        content('multiple_choice', 'Which of these are even?', {
          options: [
            { id: 'a', text: '2' },
            { id: 'b', text: '3' },
            { id: 'c', text: '4' },
          ],
          correctOptions: ['a', 'c'],
        }),
      ],
    },
  },
  fillInTheBlanks: {
    summary: 'Fill in the blanks',
    description:
      'options must be { answerType: alphanumeric | numbers, answer }. answer cannot be empty. For numbers, answer must be numeric.',
    value: {
      ...base('fill_in_the_blanks'),
      questionData: [
        content('fill_in_the_blanks', 'The capital of France is ____.', {
          answerType: 'alphanumeric',
          answer: 'Paris',
        }),
      ],
    },
  },
  comprehension: {
    summary: 'Comprehension with child questions',
    description:
      'The passage goes in questionText and options must be null. childQuestions holds the SCQ, MCQ, and fill-in-the-blank questions. Each child counts toward the test limit. The passage does not. childQuestions is omitted for every other type.',
    value: {
      ...base('comprehension'),
      questionData: [
        content(
          'comprehension',
          'A train leaves the station at 8 AM and travels at 60 km/h.',
          null,
        ),
      ],
      childQuestions: [
        {
          questionType: 'single_choice',
          questionData: [
            content('single_choice', 'What time did the train leave?', {
              options: [
                { id: 'a', text: '7 AM' },
                { id: 'b', text: '8 AM' },
              ],
              correctOptions: ['b'],
            }),
          ],
        },
        {
          questionType: 'multiple_choice',
          questionData: [
            content('multiple_choice', 'Which facts are in the passage?', {
              options: [
                { id: 'a', text: 'It leaves at 8 AM' },
                { id: 'b', text: 'It leaves at 9 AM' },
                { id: 'c', text: 'Its speed is 60 km/h' },
              ],
              correctOptions: ['a', 'c'],
            }),
          ],
        },
        {
          questionType: 'fill_in_the_blanks',
          questionData: [
            content('fill_in_the_blanks', 'The speed is ____ km/h.', {
              answerType: 'numbers',
              answer: '60',
            }),
          ],
        },
      ],
    },
  },
};
