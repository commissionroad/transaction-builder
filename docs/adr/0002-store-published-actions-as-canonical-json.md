# Store Published Actions as Canonical JSON

Published Actions will be stored as immutable canonical JSON records with only a small set of relational lookup fields such as id, chain id, NFT id, title, creation time, and schema version. Action Steps are not normalized because Published Actions do not relate to each other and the primary requirement is to preserve each Action Definition exactly as shared.
