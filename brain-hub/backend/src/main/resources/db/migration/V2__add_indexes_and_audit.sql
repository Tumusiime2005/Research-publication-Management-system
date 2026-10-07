-- ==============================================================================
-- BRAIN HUB SCHEMA MIGRATION V2: Indexes and Constraints
-- ==============================================================================

-- Indexes on publications for high-performance querying and filtering
CREATE INDEX idx_publications_status ON publications(status);
CREATE INDEX idx_publications_submitted_by ON publications(submitted_by);
CREATE INDEX idx_publications_research_area ON publications(research_area);
CREATE INDEX idx_publications_published_at ON publications(published_at DESC);
CREATE INDEX idx_publications_created_at ON publications(created_at DESC);

-- Composite index for public listing
CREATE INDEX idx_publications_public ON publications(status, published_at DESC) WHERE status = 'APPROVED';

-- Foreign key indexes
CREATE INDEX idx_publication_authors_pub_id ON publication_authors(publication_id);
CREATE INDEX idx_publication_reviews_pub_id ON publication_reviews(publication_id);
CREATE INDEX idx_publication_reviews_reviewer ON publication_reviews(reviewer_id);

-- Notifications indexes
CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_user_id, is_read, created_at DESC);

-- Refresh token lookup index
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- Audit log indexing
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
