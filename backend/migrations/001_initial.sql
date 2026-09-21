CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  login TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_login_lower_idx ON users (lower(login));
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_expires_idx ON sessions(expires_at);
CREATE TABLE criteria (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  formula TEXT NOT NULL CHECK (length(trim(formula)) > 0),
  damage_max INT NOT NULL CHECK (damage_max BETWEEN 1 AND 4),
  prob_max INT NOT NULL CHECK (prob_max BETWEEN 1 AND 4),
  priority_max INT NOT NULL CHECK (priority_max BETWEEN 1 AND 4),
  risk_appetite INT NOT NULL CHECK (risk_appetite BETWEEN 4 AND 64),
  cost_per_point NUMERIC(15,2) NOT NULL CHECK (cost_per_point >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE assets (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0), value NUMERIC(15,2) NOT NULL CHECK (value >= 0),
  priority INT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX assets_user_idx ON assets(user_id);
CREATE TABLE measures (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0), cost NUMERIC(15,2) NOT NULL CHECK (cost >= 0),
  reduce_damage INT NOT NULL DEFAULT 40 CHECK (reduce_damage BETWEEN 0 AND 100),
  reduce_prob INT NOT NULL DEFAULT 80 CHECK (reduce_prob BETWEEN 0 AND 100),
  linked_risk_id BIGINT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX measures_user_idx ON measures(user_id);
CREATE TABLE risks (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  threat TEXT NOT NULL CHECK (length(trim(threat)) > 0),
  vulnerability TEXT NOT NULL CHECK (length(trim(vulnerability)) > 0),
  damage INT NOT NULL DEFAULT 2 CHECK (damage BETWEEN 1 AND 4),
  probability INT NOT NULL DEFAULT 2 CHECK (probability BETWEEN 1 AND 4),
  priority INT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 4),
  score INT NOT NULL DEFAULT 0 CHECK (score >= 0),
  residual_score INT NULL CHECK (residual_score IS NULL OR residual_score >= 0),
  measure_id BIGINT NULL REFERENCES measures(id) ON DELETE SET NULL,
  reduce_damage INT NOT NULL DEFAULT 0 CHECK (reduce_damage BETWEEN 0 AND 100),
  reduce_prob INT NOT NULL DEFAULT 0 CHECK (reduce_prob BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX risks_user_idx ON risks(user_id);
CREATE INDEX risks_asset_idx ON risks(asset_id);
CREATE INDEX risks_measure_idx ON risks(measure_id);
ALTER TABLE measures ADD CONSTRAINT measures_linked_risk_fk FOREIGN KEY (linked_risk_id) REFERENCES risks(id) ON DELETE SET NULL;
