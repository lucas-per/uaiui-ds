import pkg from '../../../../package.json';

/**
 * ADAPTAÇÃO UaiUI: A6, o rodapé e o mini-rodapé do menu mostram a versão do @uaiui/ds, lida do package.json no build (sem editá-lo), no lugar da versão do site do Portifa.
 */
export const siteVersion = `UaiUI DS v.${pkg.version}`;
