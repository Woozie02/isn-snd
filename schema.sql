-- ISN Sports Nutrition Day 2026 Database Schema
CREATE DATABASE IF NOT EXISTS snd26 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE snd26;

-- Teams Table (Pink, Purple, Orange, Grey)
CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  color_code VARCHAR(20) NOT NULL,
  bg_tint VARCHAR(20) NOT NULL,
  description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Teams
INSERT INTO teams (id, name, color_code, bg_tint, description) VALUES
('TEAM-1', 'Team Pink', '#EC4899', '#FDF2F8', 'Sports Dietitians & Nutritionists'),
('TEAM-2', 'Team Purple', '#8B5CF6', '#F5F3FF', 'Coaches & Performance Scientists'),
('TEAM-3', 'Team Orange', '#F97316', '#FFF7ED', 'Athletes & Sports Enthusiasts'),
('TEAM-4', 'Team Grey', '#64748B', '#F8FAFC', 'Volunteers, Media & Students')
ON DUPLICATE KEY UPDATE name=VALUES(name), color_code=VALUES(color_code), bg_tint=VALUES(bg_tint), description=VALUES(description);

-- Attendees Table
CREATE TABLE IF NOT EXISTS attendees (
  id VARCHAR(30) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  ticket VARCHAR(50) DEFAULT 'Standard',
  team_id VARCHAR(20),
  initials VARCHAR(10),
  checked_in TINYINT(1) DEFAULT 0,
  checked_at VARCHAR(30),
  registered_at VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Base Attendees
INSERT INTO attendees (id, name, email, category, ticket, team_id, initials, checked_in, checked_at, registered_at) VALUES
('ISN-2601', 'Aina Danial', 'aina.danial@example.com', 'Sports dietitian', 'Professional', 'TEAM-1', 'AD', 1, '9:14 AM', '24 Oct 2026'),
('ISN-2602', 'Muhammad Khair', 'm.kh@example.com', 'Athlete', 'Standard', 'TEAM-3', 'MK', 0, '', '25 Oct 2026'),
('ISN-2603', 'Nur Syafiqah', 'syafiqah.n@example.com', 'Team coach', 'Professional', 'TEAM-2', 'NS', 1, '9:21 AM', '25 Oct 2026'),
('ISN-2604', 'Izzat Farhan', 'izzat.f@example.com', 'Sports dietitian', 'Professional', 'TEAM-1', 'IF', 1, '9:26 AM', '26 Oct 2026'),
('ISN-2605', 'Lee Wei Ting', 'weiting.lee@example.com', 'Athlete', 'Standard', 'TEAM-3', 'LT', 0, '', '27 Oct 2026'),
('ISN-2606', 'Farid Ahmad', 'farid.a@example.com', 'Team coach', 'Standard', 'TEAM-2', 'FA', 0, '', '28 Oct 2026'),
('ISN-2607', 'Sofia Rahman', 'sofia.r@example.com', 'Sports scientist', 'Professional', 'TEAM-2', 'SR', 1, '9:42 AM', '28 Oct 2026'),
('ISN-2608', 'Hannah Michelle', 'hannah.m@example.com', 'Media', 'Guest', 'TEAM-4', 'HM', 0, '', '29 Oct 2026'),
('ISN-2609', 'Ravi Lakshman', 'ravi.l@example.com', 'Event volunteer', 'Volunteer', 'TEAM-4', 'RL', 1, '9:51 AM', '30 Oct 2026'),
('ISN-2610', 'Aisha Jamal', 'aisha.j@example.com', 'Sports science student', 'Student', 'TEAM-4', 'AJ', 0, '', '31 Oct 2026')
ON DUPLICATE KEY UPDATE name=VALUES(name), team_id=VALUES(team_id);

-- Feedback Responses Table
CREATE TABLE IF NOT EXISTS feedback (
  id VARCHAR(30) PRIMARY KEY,
  attendee_id VARCHAR(30) NOT NULL,
  rating INT NOT NULL,
  session_rating INT NOT NULL,
  recommend VARCHAR(10) NOT NULL,
  comment TEXT,
  submitted_at VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Feedback Responses
INSERT INTO feedback (id, attendee_id, rating, session_rating, recommend, comment, submitted_at) VALUES
('FB-001', 'ISN-2601', 5, 5, 'Yes', 'Practical hydration strategies I can use with athletes straight away.', '01 Nov 2026'),
('FB-002', 'ISN-2603', 5, 4, 'Yes', 'Loved the balance of research and real-world coaching examples.', '31 Oct 2026'),
('FB-003', 'ISN-2604', 4, 5, 'Yes', 'Clear takeaways. More time for audience questions would be great.', '30 Oct 2026'),
('FB-004', 'ISN-2607', 5, 5, 'Yes', 'Excellent speakers and useful performance nutrition insights.', '29 Oct 2026')
ON DUPLICATE KEY UPDATE rating=VALUES(rating), session_rating=VALUES(session_rating);

