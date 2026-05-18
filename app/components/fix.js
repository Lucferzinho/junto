const fs = require('fs');
let c = fs.readFileSync('app/components/CriarTreino.tsx', 'utf8');
c = c
  .replace('Qualquer nivel', 'Qualquer n\u00edvel')
  .replace('Faca login', 'Fa\u00e7a login')
  .replace('Long run de sabado', 'Long run de s\u00e1bado')
  .replace('Local de saida', 'Local de sa\u00edda')
  .replace('Distancia', 'Dist\u00e2ncia')
  .replace('Max. de pessoas', 'M\u00e1x. de pessoas')
  .replace('Descricao do percurso', 'Descri\u00e7\u00e3o do percurso')
  .replace('Descreva o trajeto, pontos de parada, estrategia', 'Descreva o trajeto, pontos de parada, estrat\u00e9gia')
  .replace('Horario', 'Hor\u00e1rio')
  .replace("'Qualquer nivel'", "'Qualquer n\u00edvel'");
fs.writeFileSync('app/components/CriarTreino.tsx', c, 'utf8');
console.log('OK!');