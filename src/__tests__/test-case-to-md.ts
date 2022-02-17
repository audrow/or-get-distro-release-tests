import testCaseToMd from '../test-case-renderer/test-case-to-md'

import TestCase from '../__types__/TestCase'

describe('testCaseToMd', () => {
  it('should render a test case', () => {
    const testCase: TestCase = {
      name: 'test case',
      dimensions: {
        platform: 'jammy',
        dds: 'fastdds',
        installType: 'source',
      },
      generation: 37,
      checks: [
        {
          name: 'check',
          try: [
            {
              note: 'try',
              terminal: 1,
              stderr: 'stderr',
            },
          ],
          expect: [
            {
              note: 'expect',
              terminal: 1,
              stdout: 'stdout',
            },
            {
              note: 'expect',
              imageUrl: 'image url',
            },
          ],
        },
        {
          name: 'Name only check',
        },
        {
          name: 'Name only check 2',
        },
      ],
    }

    expect(testCaseToMd(testCase)).toMatchSnapshot()
  })
})
