package com.contadorhoras.extra;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface ExtraHoursRepository extends MongoRepository<ExtraHours, String> {

    List<ExtraHours> findByUserIdAndMonthOrderByCreatedAtAsc(String userId, String month);

    /** Sempre por id + usuário: um usuário nunca alcança o lançamento de outro. */
    Optional<ExtraHours> findByIdAndUserId(String id, String userId);
}
