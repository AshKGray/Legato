import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CollaborationWindow as WindowType } from '../types';

interface CollaborationWindowProps {
  window: WindowType;
  showJoinButton?: boolean;
  onJoinPress?: () => void;
  compact?: boolean;
  style?: any;
}

const CollaborationWindow: React.FC<CollaborationWindowProps> = ({
  window,
  showJoinButton = false,
  onJoinPress,
  compact = false,
  style,
}) => {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '#FF4444';
      case 'high': return '#FF8844';
      case 'medium': return '#FFAA44';
      case 'low': return '#44AA44';
      default: return '#666';
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'URGENT';
      case 'high': return 'ENDING SOON';
      case 'medium': return 'ACTIVE';
      case 'low': return 'NEW';
      default: return '';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Open for collaborations';
      case 'ending_soon': return 'Ending soon!';
      case 'closed': return 'Collaboration closed';
      case 'expired': return 'Collaboration expired';
      default: return '';
    }
  };

  const formatTimeRemaining = (hoursRemaining: number) => {
    if (hoursRemaining <= 0) {
      return 'Expired';
    } else if (hoursRemaining < 1) {
      const minutes = Math.floor(hoursRemaining * 60);
      return `${minutes}m left`;
    } else if (hoursRemaining < 24) {
      return `${Math.floor(hoursRemaining)}h left`;
    } else {
      const days = Math.floor(hoursRemaining / 24);
      const hours = Math.floor(hoursRemaining % 24);
      return `${days}d ${hours}h left`;
    }
  };

  const formatDaysRemaining = (daysRemaining: number) => {
    if (daysRemaining === 0) {
      return 'Last day';
    } else if (daysRemaining === 1) {
      return '1 day left';
    } else {
      return `${daysRemaining} days left`;
    }
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactHeader}>
          <View style={[
            styles.compactStatus,
            { backgroundColor: getUrgencyColor(window.urgencyLevel) }
          ]}>
            <Text style={styles.compactStatusText}>
              {getUrgencyText(window.urgencyLevel)}
            </Text>
          </View>
          <Text style={styles.compactTime}>
            {formatTimeRemaining(window.hoursRemaining)}
          </Text>
        </View>
        
        <View style={styles.compactProgress}>
          <View style={styles.compactProgressBar}>
            <View style={[
              styles.compactProgressFill,
              { 
                width: `${window.percentComplete}%`,
                backgroundColor: getUrgencyColor(window.urgencyLevel),
              }
            ]} />
          </View>
          <Text style={styles.compactProgressText}>
            {window.percentComplete}%
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header with status and time */}
      <View style={styles.header}>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getUrgencyColor(window.urgencyLevel) }
        ]}>
          <Text style={styles.statusText}>
            {getUrgencyText(window.urgencyLevel)}
          </Text>
        </View>
        
        <View style={styles.timeInfo}>
          <Text style={styles.timeRemaining}>
            {formatTimeRemaining(window.hoursRemaining)}
          </Text>
          <Text style={styles.statusDescription}>
            {getStatusText(window.status)}
          </Text>
        </View>
      </View>

      {/* Progress visualization */}
      <View style={styles.progressSection}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressLabel}>7-Day Collaboration Window</Text>
          <Text style={styles.progressPercent}>{window.percentComplete}% complete</Text>
        </View>
        
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            { 
              width: `${window.percentComplete}%`,
              backgroundColor: getUrgencyColor(window.urgencyLevel),
            }
          ]} />
        </View>
        
        <View style={styles.progressLabels}>
          <Text style={styles.progressStart}>
            {new Date(window.startTime).toLocaleDateString()}
          </Text>
          <Text style={styles.progressEnd}>
            {new Date(window.endTime).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Days breakdown */}
      <View style={styles.daysBreakdown}>
        <Text style={styles.daysLabel}>
          {formatDaysRemaining(window.daysRemaining)}
        </Text>
        <View style={styles.daysDots}>
          {[...Array(7)].map((_, i) => {
            const dayPassed = i < (7 - window.daysRemaining);
            const isToday = i === (7 - window.daysRemaining - 1) && window.daysRemaining > 0;
            
            return (
              <View
                key={i}
                style={[
                  styles.dayDot,
                  dayPassed && styles.dayDotPassed,
                  isToday && styles.dayDotToday,
                  { backgroundColor: dayPassed ? getUrgencyColor(window.urgencyLevel) : '#333' }
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Action area */}
      {showJoinButton && window.isOpen && onJoinPress && (
        <TouchableOpacity
          style={[
            styles.joinButton,
            { backgroundColor: getUrgencyColor(window.urgencyLevel) }
          ]}
          onPress={onJoinPress}
        >
          <Text style={styles.joinButtonText}>Join Collaboration</Text>
        </TouchableOpacity>
      )}

      {!window.isOpen && (
        <View style={styles.closedNotice}>
          <Text style={styles.closedText}>
            This collaboration window has closed. New collaborations are no longer accepted.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timeInfo: {
    flex: 1,
  },
  timeRemaining: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusDescription: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 2,
  },
  progressSection: {
    marginBottom: 15,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressPercent: {
    color: '#ccc',
    fontSize: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStart: {
    color: '#999',
    fontSize: 10,
  },
  progressEnd: {
    color: '#999',
    fontSize: 10,
  },
  daysBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  daysLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  daysDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dayDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  dayDotPassed: {
    transform: [{ scale: 1.2 }],
  },
  dayDotToday: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  joinButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closedNotice: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closedText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  // Compact styles
  compactContainer: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 10,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  compactStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  compactTime: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  compactProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  compactProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  compactProgressText: {
    color: '#ccc',
    fontSize: 10,
    minWidth: 30,
  },
});

export default CollaborationWindow; 