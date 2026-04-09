import Builder from '../core/builder';

async function dev() {
  console.log('Starting development server...');
  
  const builder = new Builder('development');
  await builder.dev();
}

export default dev;