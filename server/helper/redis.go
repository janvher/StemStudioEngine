package helper

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Redis wraps a go-redis/v9 client.
type Redis struct {
	Client *redis.Client
}

// Create creates a new Redis client and pings it.
func (r Redis) Create(addr string, dbName int) (*Redis, error) {
	client := redis.NewClient(&redis.Options{
		Addr: addr,
		DB:   dbName,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pong, err := client.Ping(ctx).Result()
	if err != nil {
		return nil, err
	}

	if pong != "PONG" {
		return nil, fmt.Errorf("redis did not respond with 'PONG', '%s'", pong)
	}

	r.Client = client
	return &r, nil
}

// Set stores a key-value pair with no expiration.
func (r *Redis) Set(key string, val []byte) error {
	return r.Client.Set(context.Background(), key, val, 0).Err()
}

// SetWithTTL stores a key-value pair with a time-to-live duration.
func (r *Redis) SetWithTTL(key string, val []byte, ttl time.Duration) error {
	return r.Client.Set(context.Background(), key, val, ttl).Err()
}

// Get retrieves a value by key. Returns (value, hit, err).
func (r *Redis) Get(key string) (val []byte, hit bool, err error) {
	val, err = r.Client.Get(context.Background(), key).Bytes()

	switch err {
	case nil:
		return val, true, nil
	case redis.Nil:
		return val, false, nil
	default:
		return val, false, err
	}
}

// Del deletes a key.
func (r *Redis) Del(key string) error {
	return r.Client.Del(context.Background(), key).Err()
}

// DelByPattern deletes all keys matching a glob pattern using SCAN.
func (r *Redis) DelByPattern(pattern string) error {
	ctx := context.Background()
	var cursor uint64
	for {
		keys, nextCursor, err := r.Client.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return err
		}
		if len(keys) > 0 {
			if err := r.Client.Del(ctx, keys...).Err(); err != nil {
				return err
			}
		}
		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}
	return nil
}
