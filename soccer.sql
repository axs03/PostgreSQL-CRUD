-- TEAM table
CREATE TABLE IF NOT EXISTS team (
    team_id SERIAL PRIMARY KEY,
    team_name VARCHAR(255) NOT NULL,
    team_colors TEXT[], -- array for the colors
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PLAYER table
CREATE TABLE IF NOT EXISTS player (
    player_id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    age INT CHECK (age BETWEEN 5 AND 18),
    team_id INT REFERENCES team(team_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- COACH table with team relationship
CREATE TABLE IF NOT EXISTS coach (
    coach_id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    home_phone VARCHAR(20) CHECK (home_phone ~ '^[0-9]{3}-[0-9]{3}-[0-9]{4}$'), -- regex for phone number
    team_id INT REFERENCES team(team_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PARENT table
CREATE TABLE IF NOT EXISTS parent (
    parent_id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    home_phone VARCHAR(20) CHECK (home_phone ~ '^[0-9]{3}-[0-9]{3}-[0-9]{4}$'), -- regex for phone number
    street VARCHAR(255),
    city VARCHAR(255),
    state CHAR(2),  -- Fixed length
    zip_code VARCHAR(10) CHECK (zip_code ~ '^\d{5}(-\d{4})?$'), -- regex for US ZIP codes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- junction table for PLAYER-PARENT relationship
CREATE TABLE IF NOT EXISTS player_parent (
    player_id INT REFERENCES player(player_id) ON DELETE CASCADE,
    parent_id INT REFERENCES parent(parent_id) ON DELETE CASCADE,
    relationship_type VARCHAR(50),
    PRIMARY KEY (player_id, parent_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DUMMY DATA
INSERT INTO team (team_name, team_colors) VALUES
('Red Dragons', ARRAY['Red','Black']),
('Blue Sharks', ARRAY['Blue','White']),
('Green Hornets', ARRAY['Green','Yellow']);


INSERT INTO player (first_name, last_name, age, team_id) VALUES
('Mike', 'Johnson', 10, 1),
('Sarah', 'Williams', 9, 1),
('David', 'Brown', 11, 2),
('Emily', 'Davis', 10, 2),
('Josh', 'Miller', 12, 3),
('Lily', 'Wilson', 9, 1);


INSERT INTO coach (first_name, last_name, home_phone, team_id) VALUES
('John', 'Smith', '555-010-1234', 1),
('Robert', 'Taylor', '555-010-2345', 1),
('Maria', 'Garcia', '555-010-3456', 2),
('Laura', 'Martinez', '555-010-4567', 3);


INSERT INTO parent (first_name, last_name, home_phone, street, city, state, zip_code) VALUES
('James', 'Johnson', '555-020-1001', '123 Oak St', 'Springfield', 'CA', '94105'),
('Linda', 'Johnson', '555-020-1002', '123 Oak St', 'Springfield', 'CA', '94105'),
('William', 'Brown', '555-020-1003', '456 Pine Rd', 'Shelbyville', 'TX', '75001'),
('Patricia', 'Davis', '555-020-1004', '789 Maple Ave', 'Ogdenville', 'NY', '10001-1234');


INSERT INTO player_parent (player_id, parent_id, relationship_type) VALUES
(1, 1, 'father'),
(1, 2, 'mother'),
(2, 2, 'mother'),
(3, 3, 'father'),
(4, 4, 'mother'),
(5, 4, 'guardian'),
(6, 1, 'father');