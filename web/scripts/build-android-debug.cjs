const { existsSync, readdirSync } = require('node:fs')
const { join } = require('node:path')
const { spawnSync } = require('node:child_process')

const projectRoot = process.cwd()
const androidDir = join(projectRoot, 'android')

function existingDir(path) {
  return typeof path === 'string' && path.length > 0 && existsSync(path)
}

function findJavaHome() {
  const candidates = []

  const gradleJdksDir = 'C:\\Users\\User\\.gradle\\jdks'
  if (existingDir(gradleJdksDir)) {
    const gradleJdks = readdirSync(gradleJdksDir)
      .filter((entry) => /(?:^|[-_])(21|17)(?:[-_.]|$)/.test(entry))
      .map((entry) => join(gradleJdksDir, entry))

    candidates.push(...gradleJdks)
  }

  candidates.push(
    'C:\\Program Files\\Java\\jdk-21',
    'C:\\Program Files\\Java\\jdk-17',
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    process.env.JAVA_HOME,
  )

  return candidates.find((candidate) => existingDir(join(candidate, 'bin', 'java.exe'))) ?? null
}

function findAndroidSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    'C:\\Users\\User\\AppData\\Local\\Android\\Sdk',
  ].filter(Boolean)

  return candidates.find((candidate) => existingDir(candidate)) ?? null
}

const javaHome = findJavaHome()
if (!javaHome) {
  console.error('No compatible Java 21/17 runtime found for Android build.')
  process.exit(1)
}

const androidSdk = findAndroidSdk()
if (!androidSdk) {
  console.error('Android SDK not found.')
  process.exit(1)
}

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidSdk,
  ANDROID_SDK_ROOT: androidSdk,
  PATH: `${join(javaHome, 'bin')};${process.env.PATH ?? ''}`,
}

const result = process.platform === 'win32'
  ? spawnSync('C:\\Windows\\System32\\cmd.exe', ['/c', 'gradlew.bat', 'assembleDebug'], {
      cwd: androidDir,
      env,
      stdio: 'inherit',
      shell: false,
    })
  : spawnSync(join(androidDir, 'gradlew'), ['assembleDebug'], {
      cwd: androidDir,
      env,
      stdio: 'inherit',
      shell: false,
    })

if (result.error) {
  console.error(result.error.message)
}

process.exit(result.status ?? 1)
