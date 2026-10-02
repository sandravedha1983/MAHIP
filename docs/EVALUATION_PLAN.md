# Evaluation Plan

## Patient Agent
Create a labeled test set of symptom utterances. Measure symptom extraction precision, recall and F1.

## Report Agent
Use a controlled set of synthetic/de-identified reports. Measure extraction accuracy and error categories.

## Image Agent
Use a held-out test set. Report:
- confusion matrix
- precision
- recall/sensitivity
- specificity
- F1
- ROC-AUC where supported

## RAG
Evaluate:
- retrieval relevance
- source correctness
- groundedness
- unsupported claims

## Orchestrator
Compare:
A. single-LLM baseline
B. multi-agent workflow

Measure:
- task completion
- groundedness
- latency
- routing correctness
- failure rate
- unnecessary agent calls

Do not turn these measurements into claims of clinical safety or diagnostic efficacy without appropriate clinical validation.
