-- ============================================================
-- Atomic Group Vote Increment Functions
-- Fixes race condition where concurrent votes all read the same
-- counter value and all write back the same incremented value.
-- ============================================================

-- Suga4U: atomically increments rooms.group_vote_state->>'current'
CREATE OR REPLACE FUNCTION increment_suga_group_vote(p_room_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_count int;
BEGIN
    UPDATE rooms
    SET group_vote_state = jsonb_set(
        group_vote_state,
        '{current}',
        to_jsonb(COALESCE((group_vote_state->>'current')::int, 0) + 1)
    )
    WHERE id = p_room_id
    RETURNING (group_vote_state->>'current')::int INTO v_new_count;

    RETURN v_new_count;
END;
$$;

-- Truth or Dare: atomically increments truth_dare_games.group_vote_state->[type]->>'current'
CREATE OR REPLACE FUNCTION increment_tod_group_vote(p_room_id uuid, p_type text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_count int;
BEGIN
    UPDATE truth_dare_games
    SET group_vote_state = jsonb_set(
        group_vote_state,
        ARRAY[p_type, 'current'],
        to_jsonb(COALESCE((group_vote_state->p_type->>'current')::int, 0) + 1)
    )
    WHERE room_id = p_room_id
    RETURNING (group_vote_state->p_type->>'current')::int INTO v_new_count;

    RETURN v_new_count;
END;
$$;
