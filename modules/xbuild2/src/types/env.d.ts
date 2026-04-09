declare global {
    interface ImportMeta {
      readonly env: {
        MODE: 'development' | 'production';
        DEV: boolean;
        PROD: boolean;
        [key: string]: string | boolean | undefined;
      };
    }  
}
