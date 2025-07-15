# Legato - Product Requirements Document

## Executive Summary

Legato is a mobile-first music collaboration platform that enables musicians, singers, and songwriters to create, remix, and build upon original music together. Unlike traditional karaoke apps, Legato focuses on original content creation with a simple, democratic voting system based purely on likes and comments that surfaces the best collaborative works.

## Vision Statement

To democratize music creation by connecting artists globally and fostering collaborative creativity through community-driven content curation based on pure engagement metrics.

## Target Users

- **Primary**: Independent musicians, singers, and songwriters (ages 16-35)
- **Secondary**: Music enthusiasts who want to participate in music creation
- **Tertiary**: Music producers and labels looking for emerging talent

## Core Value Propositions

1. **Collaborative Creation**: Turn solo ideas into full productions through community collaboration
2. **Democratic Curation**: Simple like-based voting determines which versions get featured and built upon
3. **Talent Discovery**: Organic discovery of new artists and music through pure engagement
4. **Creative Freedom**: Anyone can become a "one hit wonder" - talent speaks for itself

---

# Core Features

## 1. Song Creation & Recording Flow

### 1.1 Original Song Posting Process

**Step 1: Lyrics & Setup**
- User writes original song lyrics
- Posts lyrics to Legato platform
- Decides to record their version

**Step 2: Recording Setup Screen**
- **Recording Type**: Choose audio-only or video recording
- **Video Filters**: Optional video filters for visual enhancement
- **Tempo Control**: Set custom tempo for the song
- **Metronome**: Toggle metronome on/off during recording
- **Headphone Recommendation**: System recommends headphones for better recording quality

**Step 3: Recording Process**
- Tap record button to start countdown
- Real-time video preview during recording
- User can see themselves while recording
- Headphone audio feedback allows users to hear themselves
- Stop recording when finished

**Step 4: Post-Recording Review**
- Watch recording playback
- Adjust audio volume levels
- Apply video filters (optional)
- Retry recording if not satisfied

**Step 5: Post Creation**
- Add song description
- Add relevant tags/metadata
- Hit "Post" to publish to community
- Song becomes available for collaboration

### 1.2 Collaboration Joining Process

- Users browse available songs open for collaboration
- Preview original song and existing collaborations
- Choose to "Join" a song by recording their version
- Follow same recording flow as original creator
- Submit their collaboration to the community

## 2. Democratic Voting System (Simplified)

### 2.1 Pure Engagement Voting

- **Likes Only**: Simple thumbs up/heart system
- **Comments**: Community feedback and engagement
- **No Reputation System**: All votes count equally regardless of user history
- **No Weighted Voting**: One user, one vote per song

### 2.2 Version Management & Ranking

**7-Day Collaboration Period**
- Each song remains open for collaborations for exactly 7 days
- Original version always remains available for joining during this period
- After 7 days, song is "closed" but remains viewable

**Version Hierarchy Based on Likes**
- Version with most likes becomes the "featured version"
- Featured version is displayed prominently in charts and profiles
- All other versions remain accessible as "sub-videos"
- Users can still join any version (original or popular collaboration)
- If a new collaboration gets more likes, it becomes the new featured version

**Profile Display Logic**
- User's profile shows only their "featured versions" (highest-liked songs)
- Other versions remain accessible but not prominently displayed
- Clean, curated profile experience highlighting best work

### 2.3 Real-Time Chart Updates

- **Overall Chart**: Constantly updating based on current likes/comments across all songs
- **Genre Charts**: Same like-based ranking within specific genres
- **No Time Decay**: Recent activity doesn't automatically outweigh older popular content
- **Pure Meritocracy**: Best content rises to top regardless of creator's history

## 3. Discovery & Charts

### 3.1 Chart System

- **Top Overall**: Songs with most likes/comments across all genres
- **Genre Charts**: Most liked songs within specific genres
- **Rising**: Songs gaining likes quickly (velocity-based)
- **Featured Artists**: Artists with songs staying at top for extended periods

### 3.2 Discovery Features

- **Main Feed**: Trending songs based on likes/comments
- **Collaboration Opportunities**: Songs currently open for joining (within 7-day window)
- **Search & Filter**: By genre, collaboration status, recency
- **Suggested Discovery**: Extended chart-toppers and consistently popular artists

## 4. User Profiles & Experience

### 4.1 Profile Features

- **Featured Songs**: Only highest-liked versions displayed prominently
- **Complete Portfolio**: All songs accessible but organized by performance
- **Collaboration History**: Track record of successful collaborations
- **Simple Stats**: Total likes, comments, collaborations joined

### 4.2 No Reputation System

- **Equal Opportunity**: New users have same voting power as established users
- **Content Quality Focus**: Only engagement metrics matter
- **One Hit Wonder Friendly**: Single viral song can propel unknown artist to top
- **Fresh Talent Discovery**: Algorithm doesn't favor established creators

---

# Technical Requirements

## 5. Audio/Video Technology Stack

### 5.1 Recording & Playback (Agent 5 - Completed)

- **In-App Recording**: High-quality mobile recording with real-time preview
- **Video Recording**: Full video recording with filter support
- **Audio Monitoring**: Headphone feedback during recording
- **Metronome Integration**: Customizable tempo and click track
- **Multi-format Support**: Various audio/video format handling

### 5.2 Real-Time Features

- **Live Preview**: Real-time video preview during recording
- **Audio Feedback**: Immediate audio monitoring through headphones
- **Countdown Timer**: Recording start countdown
- **Volume Control**: Post-recording audio level adjustment

## 6. Platform Architecture

### 6.1 Backend Infrastructure (Agents 1-4 - Completed)

- **Database System**: PostgreSQL with user, song, collaboration, and vote models
- **API Core**: RESTful API for all platform operations
- **Audio Storage**: Scalable media file storage and processing
- **Charts & Discovery**: Real-time chart generation and recommendation engine

### 6.2 Voting System (Agent 6 - In Progress)

- **Simple Like System**: Basic thumbs up counting
- **Comment System**: Community engagement tracking
- **Version Management**: Automatic featured version selection
- **Chart Integration**: Real-time chart updates based on engagement

---

# User Experience Design

## 7. Core User Flows

### 7.1 Song Creation Flow

1. Write lyrics and post to platform
2. Access recording setup screen
3. Configure recording preferences (video, filters, tempo, metronome)
4. Record with real-time preview and audio feedback
5. Review and adjust recording
6. Add description and post to community
7. Song opens for 7-day collaboration period

### 7.2 Collaboration Flow

1. Browse available songs open for collaboration
2. Preview original and existing collaborations
3. Choose version to build upon
4. Follow same recording flow as original creator
5. Submit collaboration to community
6. Community votes via likes/comments
7. Popular collaborations become featured versions

### 7.3 Discovery Flow

1. Browse main chart of most-liked songs
2. Filter by genre or collaboration status
3. Preview songs with quick play functionality
4. Join interesting collaborations or discover new artists
5. Follow favorite songs and get notified of new collaborations

## 8. Social Features

### 8.1 Community Engagement

- **Simple Voting**: Like/unlike songs and collaborations
- **Comments System**: Feedback and discussion on songs
- **Collaboration Joining**: Easy process to join existing songs
- **Discovery Sharing**: Share favorite songs and collaborations

### 8.2 Content Curation

- **7-Day Windows**: Clear collaboration periods
- **Automatic Ranking**: System automatically promotes best content
- **Clean Profiles**: Curated view of user's best work
- **Equal Opportunity**: New talent can immediately compete with established artists

---

# Success Metrics

## 9. Key Performance Indicators

### 9.1 Engagement Metrics

- **Monthly Active Users (MAU)**
- **Daily Active Users (DAU)**
- **Songs Posted Per Day**
- **Collaborations Joined Per Day**
- **Average Likes Per Song**
- **Average Comments Per Song**

### 9.2 Content Quality Metrics

- **Collaboration Rate**: Percentage of songs that receive collaborations
- **Completion Rate**: Percentage of users who complete the recording flow
- **Engagement Velocity**: How quickly songs gain likes/comments
- **Chart Turnover**: How frequently chart positions change

### 9.3 Community Health Metrics

- **Active Collaborators**: Users actively joining songs
- **Content Diversity**: Variety of genres and styles
- **New Artist Success**: Rate of new users reaching charts
- **Sustained Engagement**: User retention through collaboration cycles

---

# Technical Implementation Status

## 10. Completed Agents

### Agent 1: Database & Models ✅
- User authentication and profile management
- Song, collaboration, vote, and comment models
- PostgreSQL database with proper relationships
- Migration system for schema updates

### Agent 2: Audio Storage ✅
- Scalable audio file storage system
- File upload and processing pipeline
- Integration with database for metadata
- Support for multiple audio formats

### Agent 3: API Core ✅
- RESTful API endpoints for all operations
- Authentication and authorization
- CRUD operations for songs, collaborations, votes
- Integration with other agents

### Agent 4: Charts & Discovery ✅
- Real-time chart generation
- Trending algorithms based on engagement
- Discovery recommendations
- Search and filtering capabilities

### Agent 5: Audio/Video Recording & Media ✅
- Real-time WebRTC recording (audio/video)
- File upload for pre-recorded content
- Play-along functionality for collaborations
- Media processing and format conversion
- Recording studio interface with full controls

## 11. Current Development

### Agent 6: Democratic Voting System (In Progress)
- Simple like-based voting mechanics
- Comment system integration
- Version management and ranking
- 7-day collaboration window management
- Chart integration for real-time updates

## 12. Remaining Agents

### Agent 7: Social & Community Features
- User following system
- Activity feeds and notifications
- Community guidelines and moderation
- Social sharing capabilities

### Agent 8: iOS Mobile Application
- Native iOS app with optimized performance
- Recording interface with real-time preview
- Seamless integration with backend services
- Push notifications for collaboration opportunities

---

# Future Roadmap

## 13. Phase 1 (Current) - Core Platform

- Complete voting system implementation
- Basic social features
- iOS app development
- Community launch preparation

## 14. Phase 2 (Growth) - Enhanced Features

- Advanced video filters and effects
- Collaboration notifications and recommendations
- Enhanced discovery algorithms
- Community challenges and events

## 15. Phase 3 (Scale) - Platform Expansion

- Android app launch
- Web platform development
- Advanced analytics for creators
- Monetization options for popular artists

## 16. Phase 4 (Expansion) - Ecosystem Growth

- Label and industry partnerships
- Educational content and tutorials
- International expansion
- Advanced collaboration tools

---

# Success Criteria

## 17. Launch Success

- 10,000 registered users within first 3 months
- 100 new songs posted daily
- 50% of songs receive at least one collaboration
- 4.0+ app store rating
- 30% monthly user retention rate

## 18. Growth Success

- 100,000 MAU within first year
- Top 10 music app in app store category
- Viral songs reaching 100k+ likes
- Featured content partnerships
- New artist discovery success stories

---

# Database Schema Requirements

## Core Tables (Implemented):

### Users Table
- User authentication and profile data
- Skills, genres, basic stats
- Social connections and following relationships

### Songs Table
- Original uploaded content
- Metadata (genre, mood, key, tempo)
- Collaboration status and 7-day window tracking
- Featured version tracking

### Collaborations Table
- User contributions to songs
- Audio/video file references and metadata
- Version management and parent-child relationships
- Engagement metrics (likes, comments)

### Votes Table
- Simple like/unlike system
- Comment-based engagement
- Real-time aggregation for charts
- No reputation weighting

### Comments Table
- Community feedback and discussions
- Threaded conversations
- Engagement tracking

### Follows Table
- Social networking relationships
- Artist discovery and recommendations

### Notifications Table
- Collaboration opportunities
- Engagement alerts
- Chart position updates

This PRD reflects the current implementation status and the simplified, engagement-focused vision for Legato's democratic music collaboration platform.