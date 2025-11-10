import numpy as np
from typing import List, Dict
from anthropic import Anthropic
import voyageai


class ContextRetrievalAgent:
    """Agent for semantic context retrieval using embeddings"""

    def __init__(self, anthropic_api_key: str, voyage_api_key: str):
        self.anthropic_client = Anthropic(api_key=anthropic_api_key)
        self.voyage_client = voyageai.Client(api_key=voyage_api_key)
        self.facts_cache = []  # In-memory cache for MVP
        self.embeddings_cache = []  # Cached embeddings

    def add_facts(self, facts: List[Dict]):
        """Add facts to the in-memory store"""
        for fact in facts:
            if fact not in self.facts_cache:
                self.facts_cache.append(fact)
                # Generate embedding for the fact
                embedding = self._get_embedding(fact['text'])
                self.embeddings_cache.append(embedding)

    def _get_embedding(self, text: str) -> np.ndarray:
        """Get embedding for text using Voyage AI"""
        try:
            result = self.voyage_client.embed(
                texts=[text],
                model="voyage-3",
                input_type="document"
            )
            return np.array(result.embeddings[0])
        except Exception as e:
            print(f"Error getting embedding: {e}")
            # Return zero vector as fallback
            return np.zeros(1024)

    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        dot_product = np.dot(vec1, vec2)
        norm_product = np.linalg.norm(vec1) * np.linalg.norm(vec2)

        if norm_product == 0:
            return 0.0

        return float(dot_product / norm_product)

    async def get_relevant_context(
        self,
        query: str,
        platform: str,
        limit: int = 5
    ) -> List[str]:
        """Retrieve semantically relevant context"""

        if not self.facts_cache:
            print("[Retrieval] No facts in cache")
            return []

        print(f"[Retrieval] Query: '{query}' from platform: {platform}")
        print(f"[Retrieval] Total facts in cache: {len(self.facts_cache)}")

        # Get query embedding
        query_embedding = self._get_embedding(query)

        # Calculate similarities
        similarities = []
        for i, fact in enumerate(self.facts_cache):
            # Skip facts from the same platform
            if fact.get('platform') == platform:
                print(f"[Retrieval] Skipping fact from same platform: {fact.get('text')}")
                continue

            fact_embedding = self.embeddings_cache[i]
            similarity = self._cosine_similarity(query_embedding, fact_embedding)

            print(f"[Retrieval] Fact: '{fact.get('text')}' | Similarity: {similarity:.4f}")

            similarities.append({
                'fact': fact,
                'similarity': similarity
            })

        # Sort by similarity and take top results
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        top_results = similarities[:limit]

        # Filter by minimum similarity threshold
        context = []
        for result in top_results:
            if result['similarity'] > 0.5:  # Threshold for relevance
                print(f"[Retrieval] Including: '{result['fact']['text']}' (similarity: {result['similarity']:.4f})")
                context.append(result['fact']['text'])

        print(f"[Retrieval] Returning {len(context)} context items")
        return context

    async def understand_query(self, query: str) -> Dict:
        """Use Claude to extract intent and entities from query"""
        try:
            response = self.anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=512,
                messages=[{
                    "role": "user",
                    "content": f"""Analyze this query and extract:
1. The main topic/intent
2. Key entities mentioned
3. What kind of context would be relevant

Query: "{query}"

Return JSON only:
{{
  "intent": "brief description",
  "entities": ["entity1", "entity2"],
  "context_needs": "what context would help"
}}"""
                }]
            )

            content = response.content[0].text.strip()

            # Parse JSON from response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            import json
            return json.loads(content)

        except Exception as e:
            print(f"Error understanding query: {e}")
            return {
                "intent": "unknown",
                "entities": [],
                "context_needs": "any relevant context"
            }
