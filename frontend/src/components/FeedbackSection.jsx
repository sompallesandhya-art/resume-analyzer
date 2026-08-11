import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

function StarIcon({ filled, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? "currentColor" : "none"}>
      <path
        d="M12 2.5l2.9 6.2 6.6.7-5 4.6 1.4 6.6-5.9-3.4-5.9 3.4 1.4-6.6-5-4.6 6.6-.7z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <StarIcon
              filled={isFilled}
              className={`w-8 h-8 ${isFilled ? "text-accent-violet" : "text-ink-faint"}`}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function FeedbackSection() {
  const { user } = useAuth();

  const [loadingExisting, setLoadingExisting] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const checkExistingFeedback = async () => {
      const { data, error: fetchError } = await supabase
        .from("user_feedback")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (!fetchError && data) {
        setAlreadySubmitted(true);
      }
      setLoadingExisting(false);
    };

    checkExistingFeedback();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (rating === 0) {
      setError("Please select a star rating before submitting.");
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase.from("user_feedback").insert({
      user_id: user.id,
      email: user.email,
      rating,
      feedback: feedback.trim() || null,
    });

    setSubmitting(false);

    if (insertError) {
      // Unique constraint violation means feedback already exists
      if (insertError.code === "23505") {
        setAlreadySubmitted(true);
      } else {
        setError("Something went wrong submitting your feedback. Please try again.");
      }
      return;
    }

    setSubmitted(true);
  };

  if (!user || loadingExisting) {
    return null;
  }

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-10 mt-10 animate-fade-up">
      <h2 className="font-display font-semibold text-lg text-ink-primary text-center mb-1">
        Rate Your Experience
      </h2>
      <p className="font-body text-ink-secondary text-sm text-center mb-6">
        We'd love to know what you think.
      </p>

      {alreadySubmitted || submitted ? (
        <div className="text-center py-4">
          <p className="font-display font-semibold text-accent-violet text-base">
            {submitted
              ? "Thank you for your feedback! ❤️"
              : "Thank you! Your feedback has already been submitted."}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-5">
          <div className="flex justify-center">
            <StarRating value={rating} onChange={setRating} />
          </div>

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us what you liked or what we can improve..."
            rows={4}
            className="w-full resize-y min-h-[100px] bg-white/5 border border-ink-faint/20 rounded-xl px-4 py-3 font-body text-sm text-ink-primary placeholder:text-ink-faint focus:outline-none focus:border-accent-violet/50 transition-colors"
          />

          {error && (
            <p className="text-accent-rose font-body text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full font-display font-semibold bg-accent-violet hover:bg-accent-violet/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </form>
      )}
    </div>
  );
}
