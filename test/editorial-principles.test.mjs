import test from 'node:test';
import assert from 'node:assert/strict';
import {editorialPrinciples,replacementSafeguards} from '../core/editorial-principles.mjs';
test('author safeguards warn about explicit losses without treating paraphrases as confirmed errors',()=>{
 assert.equal(editorialPrinciples.rules.length,8);
 assert.ok(replacementSafeguards('Quizá venga.','Viene.').some(w=>w.code==='certainty'));
 assert.deepEqual(replacementSafeguards('Quizá venga.','Es posible que venga.'),[]);
 assert.ok(replacementSafeguards('Podría servir en mi caso.','Sirve siempre.').some(w=>w.code==='certainty'));
 assert.ok(replacementSafeguards('Si llega a 20, no lo compramos.','Lo compramos al llegar a 30.').some(w=>w.code==='quantities'));
 assert.ok(replacementSafeguards('No lo compramos.','Lo compramos.').some(w=>w.code==='negation'));
 assert.ok(replacementSafeguards('Si llega, lo abrimos.','Lo abrimos.').some(w=>w.code==='condition'));
 assert.deepEqual(replacementSafeguards('Podría llegar mañana.','Es posible que llegue mañana.'),[]);
 assert.deepEqual(replacementSafeguards('No podemos comprar 20.','No podemos adquirir 20.'),[]);
 assert.deepEqual(replacementSafeguards('Si llega, lo abrimos.','Cuando llegue, lo abriremos.'),[]);
 assert.deepEqual(replacementSafeguards('La casa es grande.','La casa tiene mucho espacio.'),[]);
 assert.deepEqual(replacementSafeguards('No puede pagar 20.',null),[]);
});
