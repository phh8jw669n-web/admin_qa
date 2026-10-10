const testId = '221c95a0-b9d7-47c0-93e9-f69ccf6a98f5';
const grammarId = '3a7a59a4-f1c0-43bc-a9e1-5bc0f4680990';
const tensesId = '48360338-b7c0-4c71-ad9b-59aab19c0129';
const articlesId = '6b1d0c2e-4a77-4d1a-9c31-0a6e5f8b21d4';
const physicsId = '9c4e2a18-71b0-4f55-8d66-2e7a1b90c3f8';
const motionId = 'b8e6d4a2-15c9-4e70-a123-7f0c9d2e44ab';
const englishId = 'f81d17a6-204f-4841-8d29-1a5c881aa709';
const frenchId = '67df12f5-cde3-4aa8-8adf-b55c493d5a97';

export const examPaperResponseExample = {
  success: true,
  message: 'Exam paper fetched successfully',
  data: {
    testId,
    subjects: [
      {
        id: grammarId,
        name: 'Grammar',
        sections: [
          {
            sectionNo: 1,
            topic: { id: tensesId, name: 'Tenses' },
            questions: [
              {
                id: '72ebda85-ad2e-40e5-9879-e5753d12e92a',
                questionType: 'single_choice',
                sortOrder: 0,
                questionData: [
                  {
                    id: '11111111-1111-4111-8111-111111111111',
                    languageId: englishId,
                    languageName: 'English',
                    questionText: 'She ___ to school every day.',
                    options: {
                      options: [
                        { id: 'a', text: 'go' },
                        { id: 'b', text: 'goes' },
                      ],
                    },
                    rightMarks: 1,
                    negativeMarks: 0.25,
                  },
                  {
                    id: '11111111-1111-4111-8111-111111111112',
                    languageId: frenchId,
                    languageName: 'French',
                    questionText: "Elle ___ à l'école tous les jours.",
                    options: {
                      options: [
                        { id: 'a', text: 'va' },
                        { id: 'b', text: 'vont' },
                      ],
                    },
                    rightMarks: 1,
                    negativeMarks: 0.25,
                  },
                ],
                childQuestions: [],
              },
              {
                id: '06e7c904-e679-46c7-9a8b-71ba1949e724',
                questionType: 'multiple_choice',
                sortOrder: 1,
                questionData: [
                  {
                    id: '22222222-2222-4222-8222-222222222221',
                    languageId: englishId,
                    languageName: 'English',
                    questionText: 'Which of these are past tense?',
                    options: {
                      options: [
                        { id: 'a', text: 'went' },
                        { id: 'b', text: 'go' },
                        { id: 'c', text: 'saw' },
                      ],
                    },
                    rightMarks: 2,
                    negativeMarks: 0,
                  },
                ],
                childQuestions: [],
              },
            ],
          },
          {
            sectionNo: 2,
            topic: { id: articlesId, name: 'Articles' },
            questions: [
              {
                id: 'a8a83cdb-514e-4eb0-82d6-06b7c78fd716',
                questionType: 'fill_in_the_blanks',
                sortOrder: 0,
                questionData: [
                  {
                    id: '33333333-3333-4333-8333-333333333331',
                    languageId: englishId,
                    languageName: 'English',
                    questionText: 'This is ___ apple.',
                    options: { answerType: 'alphanumeric' },
                    rightMarks: 1,
                    negativeMarks: 0,
                  },
                ],
                childQuestions: [],
              },
              {
                id: '04a47f2b-38dc-45dc-a11d-7838267851ff',
                questionType: 'comprehension',
                sortOrder: 1,
                questionData: [
                  {
                    id: '44444444-4444-4444-8444-444444444441',
                    languageId: englishId,
                    languageName: 'English',
                    questionText: 'Riya bought an orange and a book.',
                    options: null,
                    rightMarks: null,
                    negativeMarks: null,
                  },
                  {
                    id: '44444444-4444-4444-8444-444444444442',
                    languageId: frenchId,
                    languageName: 'French',
                    questionText: 'Riya a acheté une orange et un livre.',
                    options: null,
                    rightMarks: null,
                    negativeMarks: null,
                  },
                ],
                childQuestions: [
                  {
                    id: '4dc5d1ee-777e-41ac-9098-1b0743c6653b',
                    questionType: 'single_choice',
                    sortOrder: 0,
                    questionData: [
                      {
                        id: '55555555-5555-4555-8555-555555555551',
                        languageId: englishId,
                        languageName: 'English',
                        questionText: 'What did Riya buy first?',
                        options: {
                          options: [
                            { id: 'a', text: 'An orange' },
                            { id: 'b', text: 'A book' },
                          ],
                        },
                        rightMarks: 1,
                        negativeMarks: 0,
                      },
                      {
                        id: '55555555-5555-4555-8555-555555555552',
                        languageId: frenchId,
                        languageName: 'French',
                        questionText: "Qu'a acheté Riya en premier ?",
                        options: {
                          options: [
                            { id: 'a', text: 'Une orange' },
                            { id: 'b', text: 'Un livre' },
                          ],
                        },
                        rightMarks: 1,
                        negativeMarks: 0,
                      },
                    ],
                    childQuestions: [],
                  },
                  {
                    id: '528d7152-2047-4f24-ab50-19bcbac75da7',
                    questionType: 'fill_in_the_blanks',
                    sortOrder: 1,
                    questionData: [
                      {
                        id: '66666666-6666-4666-8666-666666666661',
                        languageId: englishId,
                        languageName: 'English',
                        questionText: 'Riya bought ___ book.',
                        options: { answerType: 'alphanumeric' },
                        rightMarks: 1,
                        negativeMarks: 0,
                      },
                    ],
                    childQuestions: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: physicsId,
        name: 'Physics',
        sections: [
          {
            sectionNo: 1,
            topic: { id: motionId, name: 'Motion' },
            questions: [
              {
                id: '4b8ec0f9-2b2b-4499-9994-f8b626051838',
                questionType: 'single_choice',
                sortOrder: 0,
                questionData: [
                  {
                    id: '77777777-7777-4777-8777-777777777771',
                    languageId: englishId,
                    languageName: 'English',
                    questionText: 'Speed is distance divided by ___.',
                    options: {
                      options: [
                        { id: 'a', text: 'time' },
                        { id: 'b', text: 'mass' },
                      ],
                    },
                    rightMarks: 1,
                    negativeMarks: 0.25,
                  },
                ],
                childQuestions: [],
              },
            ],
          },
        ],
      },
    ],
  },
};
