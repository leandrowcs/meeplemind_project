import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { Button } from './Button';
import { useLanguage } from '../hooks/useLanguage';
import './GameDetailsModal.css';

export const GameDetailsModal = ({ game, onClose, onSave }) => {
  const { t } = useLanguage();
  const [rating, setRating] = useState(game.rating || 0);
  const [notes, setNotes] = useState(game.notes || '');

  const handleSave = () => {
    onSave({ rating, notes });
    onClose();
  };

  const ratingText = rating > 0
    ? `${rating} ${rating > 1 ? t('gamedetails.ratingStars') : t('gamedetails.ratingStar')}`
    : t('gamedetails.ratingNone');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={16} /></button>

        <h2>{game.game}</h2>

        {/* Rating */}
        <div className="form-group">
          <label>{t('gamedetails.ratingLabel')}</label>
          <div className="rating-selector">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`star ${rating >= star ? 'active' : ''}`}
                onClick={() => setRating(rating === star ? star - 1 : star)}
                title={`${star} ${star > 1 ? t('gamedetails.ratingStars') : t('gamedetails.ratingStar')}`}
              >
                <Star size={16} fill={rating >= star ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <span className="rating-text">{ratingText}</span>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label htmlFor="notes">{t('gamedetails.notesLabel')}</label>
          <textarea
            id="notes"
            placeholder={t('gamedetails.notesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength="500"
            rows="4"
          />
          <span className="char-count">{notes.length}/500</span>
        </div>

        {/* Game Info */}
        <div className="game-info">
          <div className="info-row">
            <span>{t('gamedetails.infoWinner')}</span>
            <strong>{game.winner}</strong>
          </div>
          <div className="info-row">
            <span>{t('gamedetails.infoPlayers')}</span>
            <strong>{game.players.length}</strong>
          </div>
          {game.duration && (
            <div className="info-row">
              <span>{t('gamedetails.infoDuration')}</span>
              <strong>{game.duration} {t('gamedetails.infoDurationMin')}</strong>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>
            {t('gamedetails.cancel')}
          </Button>
          <Button variant="accent" onClick={handleSave}>
            {t('gamedetails.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};
