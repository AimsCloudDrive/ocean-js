import { execSync } from 'child_process';

async function lint() {
  console.log('Linting code...');
  
  try {
    execSync('npx eslint src', { stdio: 'inherit' });
    console.log('No lint errors found!');
  } catch (error) {
    console.error('Lint errors found!');
    process.exit(1);
  }
}

export default lint;