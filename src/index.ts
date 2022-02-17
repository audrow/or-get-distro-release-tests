import fs from 'fs'
import {join} from 'path'
import yaml from 'js-yaml'

import {gatherRequirements} from './lib/gather-requirements'
import {
  outputPath,
  outputRequirementsPath,
  outputTestCasePath,
  outputTestCaseRenderPath,
} from './lib/constants'
import generateTestCases from './lib/generate-test-cases'
import warnOnDuplicateRequirementNames from './lib/warn-on-duplicate-requirement-names'
import testCaseToMd from './test-case-renderer/test-case-to-md'
import {getTestCaseSaveFileName} from './lib/generate-test-cases'
import testCaseToGithubIssue from './lib/test-case-to-gh-issue'
import {createIssue} from './test-case-db/gh-issue-crud'

import type Requirements from './__types__/Requirements'
import type Requirement from './__types__/Requirement'
import type TestCase from './__types__/TestCase'
import type Repo from './__types__/Repo'

async function initGeneratedFilesDirectory() {
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath, {recursive: true})
  }
  fs.mkdirSync(outputRequirementsPath, {recursive: true})
  fs.mkdirSync(outputTestCasePath, {recursive: true})
  fs.mkdirSync(outputTestCaseRenderPath, {recursive: true})
}

function loadRequirements(directoryPath: string) {
  const requirements: Requirement[] = []
  const files = fs.readdirSync(directoryPath)
  if (files.length === 0) {
    throw new Error(`No files found in ${directoryPath}`)
  }
  files.forEach((file) => {
    requirements.push(
      ...(
        yaml.load(
          fs.readFileSync(join(directoryPath, file), 'utf8'),
        ) as Requirements
      ).requirements,
    )
  })

  return requirements.sort((a, b) => {
    return a.name.localeCompare(b.name)
  })
}

function loadTestCases(directoryPath: string) {
  const testCases: TestCase[] = []
  const files = fs.readdirSync(directoryPath)
  if (files.length === 0) {
    throw new Error(`No files found in ${directoryPath}`)
  }
  files.forEach((file) => {
    testCases.push(
      yaml.load(fs.readFileSync(join(directoryPath, file), 'utf8')) as TestCase,
    )
  })

  return testCases.sort((a, b) => {
    return a.name.localeCompare(b.name)
  })
}

async function main() {
  await initGeneratedFilesDirectory()
  const inputRequirementsPath = join(__dirname, '..', 'requirements')
  await gatherRequirements(inputRequirementsPath, outputRequirementsPath)

  const requirements = loadRequirements(outputRequirementsPath)
  warnOnDuplicateRequirementNames(requirements, false)

  const filters = [
    {
      labels: ['^launch$'],
      isMatch: false,
    },
    {
      name: 'tutorial',
      regexOptions: 'i',
      isMatch: true,
    },
  ]
  const dimensions = {
    dds: ['fastdds', 'connext'],
    installType: ['binary'],
    platform: ['jammy'],
  }
  const generation = 1
  const repo: Repo = {
    owner: 'audrow',
    name: 'humble-tcm-example',
  }

  generateTestCases({
    requirements,
    dimensions,
    generation,
    filters,
    outputDirectory: outputTestCasePath,
    // isDryRun: true,
  })

  let testCases: TestCase[] = []
  try {
    testCases = loadTestCases(outputTestCasePath)
    testCases.forEach((testCase) => {
      console.log(testCase.name)
    })
  } catch (error) {
    console.error(error)
  }
  testCases.forEach((testCase) => {
    const md = testCaseToMd(testCase)
    const filePath = join(
      outputTestCaseRenderPath,
      `${getTestCaseSaveFileName(testCase)}.md`,
    )
    fs.writeFileSync(filePath, md)
  })
  testCases.forEach(async (testCase) => {
    const issue = testCaseToGithubIssue(testCase)
    try {
      await createIssue(repo, issue)
    } catch (error) {
      console.error(error)
    }
  })
}

if (typeof require !== 'undefined' && require.main === module) {
  main()
}
