// Palabras que no aportan a la nube (artículos, preposiciones, verbos auxiliares, etc.).
export const PALABRAS_VACIAS = `
algo algún alguna algunas alguno algunos ante antes aquel aquella aquellas aquello aquellos aquí asi así aunque cada casi como con contra cual cuales cuando cuanto cuya cuyo
dado dar dan debe deben debido dentro desde donde dos durante ella ellas ello ellos entre era eran eres esa esas ese eso esos esta están estar estas este esto estos estoy
fue fueron fui gran hace hacen hacer hacia hasta hay incluso junto lado las les llega lo los más mas mayor menos mientras misma mismas mismo mismos mucha muchas mucho muchos muy
nada ni ningún ninguna ninguno nos nosotros nuestra nuestras nuestro nuestros otra otras otro otros para pero poco podría por porque pues puede pueden que quien quienes quiere
sea seas según ser será serán si sido siempre sigue sino sobre sola solas solo solos son soy sus suya suyas suyo suyos tal también tampoco tan tanto tendrá tenemos tener tenga
tengo tiene tienen toda todas todavía todo todos tras tuvo una unas uno unos usa usan uso usted ustedes vez van varias varios veces vez vosotros voy
cuyas cuyos desde donde dicha dicho dichos dichas esas esos estaba estaban este estos esté hizo hecho hechos tiene tenía había habían ha han he hemos haber
sesión observó observa observaron
`
  .split(/\s+/)
  .filter(Boolean);
