import { execSync } from 'child_process';

async function check() {
  console.log('Checking for type errors...');
  
  try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log('No type errors found!');
  } catch (error) {
    console.error('Type errors found!');
    process.exit(1);
  }
}

export default check;