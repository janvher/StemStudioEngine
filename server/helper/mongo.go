package helper

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// NewMongo create a DocumentDB client using connectionString and databaseName.
func NewMongo(connectionString, databaseName string) (*Mongo, error) {
	m := Mongo{connectionString, databaseName, nil, nil, nil}

	fmt.Printf("🗄️  [Database] Initializing database connection...\n")
	fmt.Printf("🗄️  [Database] Database: %s\n", databaseName)

	// Determine database type
	if m.IsDocumentDB() {
		fmt.Printf("🗄️  [Database] Type: AWS DocumentDB\n")
	} else {
		fmt.Printf("🗄️  [Database] Type: MongoDB (local)\n")
	}

	// DocumentDB specific client options
	clientOptions := options.Client().ApplyURI(connectionString)

	// Set appropriate timeouts
	duration := time.Second * 20
	// Common settings for both DocumentDB and MongoDB
	clientOptions.SetRetryReads(true)

	if m.IsDocumentDB() {
		// DocumentDB specific settings
		fmt.Printf("🗄️  [Database] Configuring DocumentDB settings (pool: 10-50, retries: reads only)\n")
		clientOptions.SetRetryWrites(false)
		clientOptions.SetMaxPoolSize(50)
		clientOptions.SetMinPoolSize(10)
		clientOptions.ServerSelectionTimeout = &duration
		clientOptions.SocketTimeout = &duration
	} else {
		// MongoDB local settings
		fmt.Printf("🗄️  [Database] Configuring MongoDB settings (pool: 5-100, retries: reads+writes)\n")
		clientOptions.SetRetryWrites(true)
		clientOptions.SetMaxPoolSize(100)
		clientOptions.SetMinPoolSize(5)
	}

	clientOptions.ConnectTimeout = &duration

	// Create client with context
	fmt.Printf("🗄️  [Database] Establishing connection (timeout: 20s)...\n")
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		fmt.Printf("❌ [Database] Failed to connect: %v\n", err)
		return nil, fmt.Errorf("failed to connect to database: %v", err)
	}

	// Verify connection
	fmt.Printf("🗄️  [Database] Verifying connection with ping...\n")
	if err := client.Ping(ctx, nil); err != nil {
		fmt.Printf("❌ [Database] Ping failed: %v\n", err)
		return nil, fmt.Errorf("failed to ping database: %v", err)
	}

	db := client.Database(databaseName)

	m.Client = client
	m.Database = db

	fmt.Printf("✅ [Database] Successfully connected to %s\n", databaseName)

	return &m, nil
}

// Mongo represent a DocumentDB client. You should not create Mongo directly,
// and use NewMongo instead.
type Mongo struct {
	ConnectionString string
	DatabaseName     string
	Client           *mongo.Client
	Database         *mongo.Database
	sessionContext   *mongo.SessionContext
}

// FilterUpdate represents a filter/update pair for bulk update operations.
type FilterUpdate struct {
	Filter interface{}
	Update interface{}
	Upsert bool
}

// IsDocumentDB checks if the connection is to DocumentDB by examining the connection string
func (m Mongo) IsDocumentDB() bool {
	return strings.Contains(m.ConnectionString, "docdb.amazonaws.com")
}

// checkDB determine whether the database is actually created.
func (m Mongo) checkDB() error {
	if m.Client == nil || m.Database == nil {
		return fmt.Errorf("DocumentDB client is not created, use NewMongo to create")
	}
	return nil
}

// ListCollectionNames list collectionNames of database.
func (m Mongo) ListCollectionNames() (collectionNames []string, err error) {
	if err := m.checkDB(); err != nil {
		return nil, err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	nameOnly := true
	listOptions := options.ListCollectionsOptions{NameOnly: &nameOnly}

	return m.Database.ListCollectionNames(ctx, bson.M{}, &listOptions)
}

// CollectionExists determine whether a collection existed.
func (m Mongo) CollectionExists(name string) (existed bool, err error) {
	if err := m.checkDB(); err != nil {
		return false, err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	nameOnly := true
	listOptions := options.ListCollectionsOptions{NameOnly: &nameOnly}
	collections, err := m.Database.ListCollectionNames(ctx, bson.M{}, &listOptions)
	if err != nil {
		return false, err
	}

	for _, collection := range collections {
		if collection == name {
			return true, nil
		}
	}

	return false, nil
}

// CreateCollection create a new collection.
func (m Mongo) CreateCollection(name string) error {
	if err := m.checkDB(); err != nil {
		return err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	return m.Database.CreateCollection(ctx, name)
}

// GetCollection get a collection by collectionName.
func (m Mongo) GetCollection(name string) (collection *mongo.Collection, err error) {
	if err := m.checkDB(); err != nil {
		return nil, err
	}

	return m.Database.Collection(name), nil
}

// RunCommand run a DocumentDB command.
func (m Mongo) RunCommand(command interface{}) (result *mongo.SingleResult, err error) {
	if err := m.checkDB(); err != nil {
		return nil, err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	return m.Database.RunCommand(ctx, command), nil
}

// DropCollection drop a collection.
func (m Mongo) DropCollection(name string) error {
	if err := m.checkDB(); err != nil {
		return err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	return m.Database.Collection(name).Drop(ctx)
}

// InsertOne insert one document to a collection.
func (m Mongo) InsertOne(collectionName string, document interface{}) (*mongo.InsertOneResult, error) {
	collection, err := m.GetCollection(collectionName)
	if err != nil {
		return nil, err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	return collection.InsertOne(ctx, document)
}

// InsertMany insert many documents to a collection.
func (m Mongo) InsertMany(collectionName string, documents []interface{}) (*mongo.InsertManyResult, error) {
	collection, err := m.GetCollection(collectionName)
	if err != nil {
		return nil, err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	return collection.InsertMany(ctx, documents)
}

// Count get documents count of a collection.
func (m Mongo) Count(collectionName string, filter interface{}) (int64, error) {
	collection, err := m.GetCollection(collectionName)
	if err != nil {
		return 0, err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	return collection.CountDocuments(ctx, filter)
}

func (m Mongo) Aggregate(
	collectionName string,
	pipeline mongo.Pipeline,
	results interface{},
	opts ...*options.AggregateOptions,
) error {
	collection, err := m.GetCollection(collectionName)
	if err != nil {
		return err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	cursor, err := collection.Aggregate(ctx, pipeline, opts...)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	return cursor.All(ctx, results)
}

// FindOne find one document from a collection.
func (m Mongo) FindOne(collectionName string, filter interface{}, result interface{}, opts ...*options.FindOneOptions) (find bool, err error) {
	collection, err := m.GetCollection(collectionName)
	if err != nil {
		return false, err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	cursor := collection.FindOne(ctx, filter, opts...)
	if cursor.Err() == mongo.ErrNoDocuments {
		return false, nil
	}

	if err := cursor.Decode(result); err != nil {
		return false, err
	}

	return true, nil
}

// Find find a cursor from a collection.
func (m Mongo) Find(collectionName string, filter interface{}, opts ...*options.FindOptions) (*mongo.Cursor, error) {
	collection, err := m.GetCollection(collectionName)
	if err != nil {
		return nil, err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	return collection.Find(ctx, filter, opts...)
}

// FindMany find many documents in the collection.
func (m Mongo) FindMany(collectionName string, filter interface{}, results interface{}, opts ...*options.FindOptions) (err error) {
	collection, err := m.GetCollection(collectionName)
	if err != nil {
		return err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	cursor, err := collection.Find(ctx, filter, opts...)
	if err != nil {
		return err
	}

	defer cursor.Close(ctx)

	return cursor.All(ctx, results)
}

// FindAll find all the documents in the collection.
func (m Mongo) FindAll(collectionName string, results interface{}, opts ...*options.FindOptions) (err error) {
	return m.FindMany(collectionName, bson.M{}, results, opts...)
}

// UpdateOne update one document.
func (m Mongo) UpdateOne(
	collectionName string,
	filter interface{},
	update interface{},
	opts ...*options.UpdateOptions,
) (*mongo.UpdateResult, error) {
	collection, err := m.GetCollection(collectionName)
	if err != nil {
		return nil, err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	if len(opts) > 0 {
		return collection.UpdateOne(ctx, filter, update, opts...)
	}

	return collection.UpdateOne(ctx, filter, update)
}

// UpdateMany update many documents in the collection.
func (m Mongo) UpdateMany(collectionName string, filter interface{}, update interface{}) (*mongo.UpdateResult, error) {
	collection, err := m.GetCollection(collectionName)
	if err != nil {
		return nil, err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	return collection.UpdateMany(ctx, filter, update)
}

// UpdateAll update all the documents in the collection.
func (m Mongo) UpdateAll(collectionName string, update interface{}) (*mongo.UpdateResult, error) {
	return m.UpdateMany(collectionName, bson.M{}, update)
}

// UpdateManyIndividual updates multiple documents where each document may have a different update.
// Takes a slice of filter/update pairs and executes them in a single bulk write operation.
func (m Mongo) UpdateManyIndividual(collectionName string, updates []FilterUpdate) (*mongo.BulkWriteResult, error) {
	if len(updates) == 0 {
		return &mongo.BulkWriteResult{}, nil
	}

	collection, err := m.GetCollection(collectionName)
	if err != nil {
		return nil, err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	models := make([]mongo.WriteModel, len(updates))
	for i, u := range updates {
		model := mongo.NewUpdateOneModel().SetFilter(u.Filter).SetUpdate(u.Update)
		if u.Upsert {
			model.SetUpsert(true)
		}
		models[i] = model
	}

	return collection.BulkWrite(ctx, models)
}

// DeleteOne delete one document from the collection.
func (m Mongo) DeleteOne(collectionName string, filter interface{}) (*mongo.DeleteResult, error) {
	collection, err := m.GetCollection(collectionName)
	if err != nil {
		return nil, err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	return collection.DeleteOne(ctx, filter)
}

// DeleteMany delete many documents from the collection.
func (m Mongo) DeleteMany(collectionName string, filter interface{}) (*mongo.DeleteResult, error) {
	collection, err := m.GetCollection(collectionName)
	if err != nil {
		return nil, err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	return collection.DeleteMany(ctx, filter)
}

// DeleteAll delete all documents from the collection.
func (m Mongo) DeleteAll(collectionName string) (*mongo.DeleteResult, error) {
	return m.DeleteMany(collectionName, bson.M{})
}

// UseSession create a new session and you can use transactions in the callback functions.
//
// IMPORTANT: You cannot create new collection in a transaction,
// and you should create the collection before the transaction start.
// Note: DocumentDB has limited transaction support compared to MongoDB
func (m *Mongo) UseSession(fn func(sessionContext mongo.SessionContext) error) (err error) {
	if err := m.checkDB(); err != nil {
		return err
	}

	ctx := context.TODO()
	err = m.Client.UseSession(ctx, func(sessionContext mongo.SessionContext) error {
		m.sessionContext = &sessionContext
		m.Database = m.Client.Database(m.DatabaseName)
		return fn(sessionContext)
	})
	return err
}

// FindOneWithProjection finds one document with projection (field filtering)
func (m Mongo) FindOneWithProjection(collectionName string, filter interface{}, projection interface{}, result interface{}) (find bool, err error) {
	collection, err := m.GetCollection(collectionName)
	if err != nil {
		return false, err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	opts := options.FindOne().SetProjection(projection)
	cursor := collection.FindOne(ctx, filter, opts)
	if cursor.Err() == mongo.ErrNoDocuments {
		return false, nil
	}

	if err := cursor.Decode(result); err != nil {
		return false, err
	}

	return true, nil
}

// FindManyWithProjection finds many documents with projection (field filtering)
func (m Mongo) FindManyWithProjection(collectionName string, filter interface{}, projection interface{}, results interface{}) (err error) {
	collection, err := m.GetCollection(collectionName)
	if err != nil {
		return err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	opts := options.Find().SetProjection(projection)
	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return err
	}

	defer cursor.Close(ctx)

	return cursor.All(ctx, results)
}

// Disconnect closes sockets to the topology referenced by this Client.
func (m *Mongo) Disconnect() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return m.Client.Disconnect(ctx)
}

// IndexModel represents a MongoDB index configuration
type IndexModel struct {
	Keys    bson.D
	Options *options.IndexOptions
}

// EnsureIndex creates an index if it does not already exist.
// Returns true if index was created, false if it already existed, and error if failed.
func (m *Mongo) EnsureIndex(collectionName string, model IndexModel) (bool, error) {
	if err := m.checkDB(); err != nil {
		return false, err
	}

	collection, err := m.GetCollection(collectionName)
	if err != nil {
		return false, err
	}

	ctx := context.TODO()
	if m.sessionContext != nil {
		ctx = *m.sessionContext
	}

	// Create the index model
	indexModel := mongo.IndexModel{
		Keys:    model.Keys,
		Options: model.Options,
	}

	// CreateIndexes is idempotent - it will not error if index already exists
	indexName, err := collection.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		return false, fmt.Errorf("failed to create index on %s: %w", collectionName, err)
	}

	// Check if this is a new index by comparing with existing indexes
	cursor, err := collection.Indexes().List(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to list indexes: %w", err)
	}
	defer cursor.Close(ctx)

	var indexes []bson.M
	if err = cursor.All(ctx, &indexes); err != nil {
		return false, fmt.Errorf("failed to decode indexes: %w", err)
	}

	// If we got here without error, the index exists (either created now or before)
	// We'll consider it as successfully ensured
	fmt.Printf("📊 [Index] Ensured index '%s' on collection '%s'\n", indexName, collectionName)
	return true, nil
}

// EnsureIndexes creates multiple indexes on a collection if they don't exist.
// Returns the number of indexes ensured and any error encountered.
func (m *Mongo) EnsureIndexes(collectionName string, models []IndexModel) (int, error) {
	if err := m.checkDB(); err != nil {
		return 0, err
	}

	ensuredCount := 0
	for _, model := range models {
		created, err := m.EnsureIndex(collectionName, model)
		if err != nil {
			return ensuredCount, err
		}
		if created {
			ensuredCount++
		}
	}

	return ensuredCount, nil
}
