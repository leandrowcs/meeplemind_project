import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { Button } from './Button';
import './GameDetailsModal.css';

export const GameDetailsModal = ({ game, onClose, onSave }) => {
  const [rating, setRating] = useState(game.rating || 0);
  const [notes, setNotes] = useState(game.notes || '');

  const handleSave = () => {
    onSave({ rating, notes });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={16} /></button>

        <h2>{game.game}</h2>

        {/* Rating */}
        <div className="form-group">
          <label>Avaliação da Partida</label>
          <div className="rating-selector">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`star ${rating >= star ? 'active' : ''}`}
                onClick={() => setRating(rating === star ? star - 1 : star)}
                title={`${star} estrela${star > 1 ? 's' : ''}`}
              >
                <Star size={16} fill={rating >= star ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <span className="rating-text">
            {rating > 0 ? `${rating} estrela${rating > 1 ? 's' : ''}` : 'Sem avaliação'}
          </span>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label htmlFor="notes">Notas sobre a Partida</label>
          <textarea
            id="notes"
            placeholder="Ex: partida acirrada até o final, próxima vez em outro jogo..."
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
            <span>Vencedor:</span>
            <strong>{game.winner}</strong>
          </div>
          <div className="info-row">
            <span>Jogadores:</span>
            <strong>{game.players.length}</strong>
          </div>
          {game.duration && (
            <div className="info-row">
              <span>Duração:</span>
              <strong>{game.duration} min</strong>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="accent" onClick={handleSave}>
            Salvar Detalhes
          </Button>
        </div>
      </div>
    </div>
  );
};
