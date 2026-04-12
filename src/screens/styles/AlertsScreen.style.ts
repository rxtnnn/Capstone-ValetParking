import { StyleSheet } from 'react-native';
import { COLORS } from '../../constants/AppConst';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  alertCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  alertCardAcknowledged: {
    borderLeftColor: COLORS.green,
    opacity: 0.8,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  alertSeverity: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  acknowledgeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  acknowledgeButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  acknowledgedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acknowledgedText: {
    fontSize: 12,
    color: COLORS.green,
    marginLeft: 4,
    fontWeight: '500',
  },
  alertContent: {
    gap: 8,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertUid: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
    fontFamily: 'monospace',
  },
  alertText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  messageContainer: {
    backgroundColor: '#FFF0F0',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  messageText: {
    fontSize: 13,
    color: '#FF6B6B',
  },
  acknowledgedInfo: {
    backgroundColor: '#F0FFF0',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  acknowledgedInfoText: {
    fontSize: 12,
    color: COLORS.green,
  },
  acknowledgedNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  notesInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalCancelText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  modalConfirmButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalConfirmText: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '600',
  },
});
