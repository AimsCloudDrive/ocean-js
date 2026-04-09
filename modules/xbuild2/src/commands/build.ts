import Builder from '../core/builder';

async function build() {
  console.log('Building for production...');
  
  const builder = new Builder('production');
  await builder.build();
  
  console.log('Build completed!');
}

export default build;