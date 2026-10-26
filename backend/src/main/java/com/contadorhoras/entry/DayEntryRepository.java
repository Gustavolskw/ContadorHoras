package com.contadorhoras.entry;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface DayEntryRepository extends MongoRepository<DayEntry, String> {

    Optional<DayEntry> findByUserIdAndDate(String userId, String date);

    @Query(value = "{ 'userId': ?0, 'date': { $gte: ?1, $lte: ?2 } }", sort = "{ 'date': 1 }")
    List<DayEntry> findRange(String userId, String fromInclusive, String toInclusive);

    void deleteByUserIdAndDate(String userId, String date);
}
