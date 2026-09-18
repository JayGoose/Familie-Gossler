
import assert from "node:assert/strict";
import { indexGraph, relationshipLabel } from "../public/js/relationship.js";

const people=[
 {id:"a",gender:"m"},{id:"b",gender:"f"},{id:"c",gender:"m"},{id:"d",gender:"f"},{id:"e",gender:"f"}
];
const relations=[
 {person_a:"a",person_b:"c",relation_type:"parent"},
 {person_a:"b",person_b:"c",relation_type:"parent"},
 {person_a:"a",person_b:"d",relation_type:"parent"},
 {person_a:"e",person_b:"d",relation_type:"parent"}
];
const g=indexGraph(people,relations);
assert.equal(relationshipLabel(g,"c","d"),"Halbschwester");
console.log("relationship tests passed");
