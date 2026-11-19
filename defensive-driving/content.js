/* Defensive driving course content. Single source: the page text AND the audio scripts both come from here.
   t = module title, i = sentences (**bold** supported). Keep every sentence short and complete: it is read aloud.
   If you edit this file, regenerate scripts/*.txt (see README.md) so the audio script matches the screen. */
window.COURSE = {
 version: '1.0.0',
 ui: {
  en: { title:'Defensive driving', module:'Module', of:'of', listen:'Listen', pause:'Pause', stop:'Stop', prev:'Previous', next:'Next', done:'Course complete', doneBody:'You have finished all modules. Take the Driver Induction final check if you have not done it yet.', toInduction:'Go to Driver induction', restart:'Start again', voiceNote:'Browser voice', speed:'Speed', contents:'Modules' },
  id: { title:'Mengemudi defensif', module:'Modul', of:'dari', listen:'Dengarkan', pause:'Jeda', stop:'Berhenti', prev:'Sebelumnya', next:'Berikutnya', done:'Kursus selesai', doneBody:'Anda telah menyelesaikan semua modul. Ikuti tes akhir Induksi Pengemudi jika belum.', toInduction:'Ke Induksi Pengemudi', restart:'Mulai lagi', voiceNote:'Suara peramban', speed:'Kecepatan', contents:'Modul' },
  ms: { title:'Pemanduan defensif', module:'Modul', of:'daripada', listen:'Dengar', pause:'Jeda', stop:'Henti', prev:'Sebelumnya', next:'Seterusnya', done:'Kursus tamat', doneBody:'Anda telah menamatkan semua modul. Ambil ujian akhir Induksi Pemandu jika belum.', toInduction:'Ke Induksi Pemandu', restart:'Mula semula', voiceNote:'Suara pelayar', speed:'Kelajuan', contents:'Modul' }
 },
 modules: [
  { t:{ en:'Why defensive driving', id:'Mengapa mengemudi defensif', ms:'Mengapa pemanduan defensif' },
    i:{
     en:[
      'Defensive driving means driving so that you stay safe, even when other people make mistakes.',
      'You cannot control other drivers, motorbikes or the weather. You **can** control your speed, your distance and your attention.',
      'Most crashes can be avoided. They happen when drivers are too fast, too close, tired or distracted.',
      'You carry people who trust you. Their safety is your first job on every trip.'],
     id:[
      'Mengemudi defensif berarti mengemudi sedemikian rupa agar Anda tetap aman, meskipun orang lain berbuat salah.',
      'Anda tidak bisa mengendalikan pengemudi lain, sepeda motor, atau cuaca. Anda **bisa** mengendalikan kecepatan, jarak, dan perhatian Anda.',
      'Sebagian besar kecelakaan dapat dihindari. Kecelakaan terjadi ketika pengemudi terlalu cepat, terlalu dekat, lelah, atau tidak fokus.',
      'Anda membawa orang yang mempercayai Anda. Keselamatan mereka adalah tugas pertama Anda di setiap perjalanan.'],
     ms:[
      'Pemanduan defensif bermaksud memandu supaya anda kekal selamat, walaupun orang lain melakukan kesilapan.',
      'Anda tidak dapat mengawal pemandu lain, motosikal atau cuaca. Anda **boleh** mengawal kelajuan, jarak dan perhatian anda.',
      'Kebanyakan kemalangan boleh dielakkan. Ia berlaku apabila pemandu terlalu laju, terlalu dekat, letih atau terganggu.',
      'Anda membawa orang yang mempercayai anda. Keselamatan mereka ialah tugas pertama anda pada setiap perjalanan.']
    } },
  { t:{ en:'Before you drive', id:'Sebelum mengemudi', ms:'Sebelum memandu' },
    i:{
     en:[
      'Drive only if you are rested, sober and well. **No alcohol or drugs**, before or during driving.',
      'Walk around the vehicle first. Check the tyres, lights, brakes, mirrors, windscreen, and look for leaks.',
      'Adjust your seat and mirrors. **Everyone wears a seatbelt before the vehicle moves.**',
      'Put your phone away. **No phone use while driving**, hands-free included.',
      'Report any defect to your supervisor. Do not drive a vehicle that is not safe.'],
     id:[
      'Mengemudilah hanya jika Anda cukup istirahat, sehat, dan tidak terpengaruh apa pun. **Tidak boleh alkohol atau narkoba**, sebelum maupun saat mengemudi.',
      'Kelilingi kendaraan terlebih dahulu. Periksa ban, lampu, rem, kaca spion, kaca depan, dan lihat apakah ada kebocoran.',
      'Atur kursi dan kaca spion. **Semua orang memakai sabuk pengaman sebelum kendaraan bergerak.**',
      'Simpan ponsel Anda. **Tidak memakai HP saat mengemudi**, termasuk hands-free.',
      'Laporkan setiap kerusakan kepada atasan Anda. Jangan mengemudikan kendaraan yang tidak aman.'],
     ms:[
      'Memandu hanya jika anda cukup berehat, sihat dan tidak terjejas oleh apa-apa. **Tiada alkohol atau dadah**, sebelum atau semasa memandu.',
      'Berjalan mengelilingi kenderaan dahulu. Periksa tayar, lampu, brek, cermin, cermin depan, dan lihat jika ada kebocoran.',
      'Laraskan tempat duduk dan cermin. **Semua orang memakai tali pinggang keledar sebelum kenderaan bergerak.**',
      'Simpan telefon anda. **Tiada penggunaan telefon semasa memandu**, termasuk tanpa tangan.',
      'Laporkan sebarang kerosakan kepada penyelia anda. Jangan memandu kenderaan yang tidak selamat.']
    } },
  { t:{ en:'Speed and space', id:'Kecepatan dan jarak', ms:'Kelajuan dan jarak' },
    i:{
     en:[
      'Obey the posted speed limit, and go slower when conditions are bad. The limit is a maximum, not a target.',
      '**Keep at least 3 seconds from the vehicle ahead.** Pick a fixed object, and count when the vehicle ahead passes it.',
      'Make it **4 seconds or more** in rain, at night, or behind trucks.',
      'More speed means a much longer stopping distance. If you double your speed, your braking distance becomes about four times longer.',
      'Always leave yourself an escape route: a space to move into if something goes wrong.'],
     id:[
      'Patuhi batas kecepatan yang terpasang, dan kurangi kecepatan saat kondisi buruk. Batas kecepatan adalah maksimum, bukan target.',
      '**Jaga jarak minimal 3 detik dari kendaraan di depan.** Pilih satu objek tetap, lalu hitung saat kendaraan di depan melewatinya.',
      'Jadikan **4 detik atau lebih** saat hujan, malam hari, atau di belakang truk.',
      'Semakin cepat, jarak berhenti semakin panjang. Jika kecepatan Anda dua kali lipat, jarak pengereman menjadi sekitar empat kali lebih panjang.',
      'Selalu sediakan jalur keluar: ruang untuk bergerak jika terjadi sesuatu.'],
     ms:[
      'Patuhi had laju yang ditetapkan, dan perlahankan kenderaan apabila keadaan buruk. Had laju ialah maksimum, bukan sasaran.',
      '**Jaga jarak sekurang-kurangnya 3 saat dari kenderaan di hadapan.** Pilih satu objek tetap, kemudian kira apabila kenderaan di hadapan melepasinya.',
      'Jadikan **4 saat atau lebih** semasa hujan, waktu malam atau di belakang lori.',
      'Lebih laju bermakna jarak berhenti lebih panjang. Jika kelajuan anda digandakan, jarak brek menjadi kira-kira empat kali lebih panjang.',
      'Sentiasa sediakan laluan keluar: ruang untuk bergerak jika sesuatu berlaku.']
    } },
  { t:{ en:'Look ahead', id:'Lihat jauh ke depan', ms:'Pandang jauh ke hadapan' },
    i:{
     en:[
      'Scan far ahead, not only at the vehicle in front. The earlier you see a problem, the more time you have.',
      'Check your mirrors every 5 to 8 seconds. Check your blind spots before you turn or change lane.',
      'Keep your eyes moving, and expect that other road users have not seen you.',
      'At junctions, slow down and look both ways. Look again before you move, even if you have the right of way.',
      '**Motorbikes and pedestrians:** check blind spots, give them space, and never turn without looking twice.'],
     id:[
      'Pindai jauh ke depan, bukan hanya kendaraan di depan Anda. Semakin cepat Anda melihat masalah, semakin banyak waktu Anda.',
      'Periksa kaca spion setiap 5 sampai 8 detik. Periksa titik buta sebelum berbelok atau pindah lajur.',
      'Gerakkan mata Anda terus, dan anggap pengguna jalan lain belum melihat Anda.',
      'Di persimpangan, perlambat dan lihat ke kedua arah. Lihat sekali lagi sebelum jalan, meskipun Anda punya hak jalan.',
      '**Sepeda motor dan pejalan kaki:** periksa titik buta, beri ruang, dan jangan pernah berbelok tanpa melihat dua kali.'],
     ms:[
      'Imbas jauh ke hadapan, bukan hanya kenderaan di depan anda. Semakin awal anda nampak masalah, semakin banyak masa anda.',
      'Periksa cermin setiap 5 hingga 8 saat. Periksa titik buta sebelum membelok atau menukar lorong.',
      'Gerakkan mata anda sentiasa, dan anggap pengguna jalan lain belum nampak anda.',
      'Di persimpangan, perlahankan kenderaan dan lihat kedua-dua arah. Lihat sekali lagi sebelum bergerak, walaupun anda ada hak laluan.',
      '**Motosikal dan pejalan kaki:** periksa titik buta, beri ruang, dan jangan sekali-kali membelok tanpa melihat dua kali.']
    } },
  { t:{ en:'Rain, night and bad roads', id:'Hujan, malam, dan jalan buruk', ms:'Hujan, malam dan jalan buruk' },
    i:{
     en:[
      '**Wet roads:** slow down early, brake gently and early, and avoid sudden steering.',
      '**Never drive through floodwater.** Turn back.',
      'In heavy rain, if you cannot see well, slow down and switch on your lights. Pull over safely if you need to.',
      '**Night:** dip your lights, and do not drive faster than you can stop within your headlight range.',
      'If you are dazzled by oncoming lights, slow down and look to the left edge of the road.',
      'Watch for oil-palm fruit, oil, mud and potholes on the road.'],
     id:[
      '**Jalan basah:** perlambat lebih awal, rem dengan lembut dan lebih awal, dan hindari membelok mendadak.',
      '**Jangan pernah menerobos banjir.** Putar balik.',
      'Saat hujan deras, jika pandangan Anda terbatas, perlambat dan nyalakan lampu. Menepilah dengan aman jika perlu.',
      '**Malam hari:** gunakan lampu dekat, dan jangan melaju lebih cepat dari jarak henti Anda dalam jangkauan lampu.',
      'Jika silau oleh lampu dari depan, perlambat dan lihat tepi kiri jalan.',
      'Waspadai buah sawit, minyak, lumpur, dan lubang di jalan.'],
     ms:[
      '**Jalan basah:** perlahankan kenderaan lebih awal, brek dengan lembut dan lebih awal, dan elakkan stereng secara mengejut.',
      '**Jangan sekali-kali menerjah banjir.** Berpatah balik.',
      'Semasa hujan lebat, jika penglihatan anda terhad, perlahankan kenderaan dan hidupkan lampu. Berhenti di tepi dengan selamat jika perlu.',
      '**Waktu malam:** gunakan lampu dekat, dan jangan memandu lebih laju daripada jarak henti anda dalam jangkauan lampu.',
      'Jika silau oleh lampu dari hadapan, perlahankan kenderaan dan lihat tepi kiri jalan.',
      'Berhati-hati dengan buah kelapa sawit, minyak, lumpur dan lubang di jalan.']
    } },
  { t:{ en:'Trucks, equipment and reversing', id:'Truk, alat berat, dan mundur', ms:'Lori, jentera dan mengundur' },
    i:{
     en:[
      'Stay out of the blind spots of heavy trucks. If you cannot see the truck driver in the mirror, the driver cannot see you.',
      'Never overtake on bends or hill crests. Expect wide turns from long vehicles.',
      'On site, give way to trucks, cranes and heavy equipment, and stay where the operator can see you.',
      '**Reversing:** walk around first, then reverse slowly. Use a spotter if you cannot see clearly. Park so that you can drive out forwards.',
      '**Never drive, park or stand under a suspended load.** Stop well clear and wait.'],
     id:[
      'Jauhi titik buta truk berat. Jika Anda tidak bisa melihat pengemudi truk di kaca spion, pengemudi itu juga tidak bisa melihat Anda.',
      'Jangan pernah menyalip di tikungan atau puncak tanjakan. Antisipasi belokan lebar dari kendaraan panjang.',
      'Di lokasi, beri jalan kepada truk, crane, dan alat berat, dan tetap berada di tempat yang terlihat oleh operator.',
      '**Mundur:** kelilingi kendaraan dahulu, lalu mundur perlahan. Gunakan pemandu jika pandangan Anda tidak jelas. Parkir agar Anda bisa keluar dengan maju.',
      '**Jangan pernah mengemudi, parkir, atau berdiri di bawah beban yang menggantung.** Berhenti jauh dan tunggu.'],
     ms:[
      'Jauhi titik buta lori berat. Jika anda tidak nampak pemandu lori di dalam cermin, pemandu itu juga tidak nampak anda.',
      'Jangan sekali-kali memotong di selekoh atau puncak bukit. Jangkakan pusingan lebar daripada kenderaan panjang.',
      'Di tapak, beri laluan kepada lori, kren dan jentera berat, dan kekal di tempat yang operator boleh nampak.',
      '**Mengundur:** berjalan mengelilingi kenderaan dahulu, kemudian undur perlahan-lahan. Gunakan pemandu arah jika penglihatan anda tidak jelas. Letak kenderaan supaya anda boleh keluar ke hadapan.',
      '**Jangan sekali-kali memandu, meletak kenderaan atau berdiri di bawah beban tergantung.** Berhenti jauh dan tunggu.']
    } },
  { t:{ en:'Fatigue and distraction', id:'Kelelahan dan gangguan', ms:'Keletihan dan gangguan' },
    i:{
     en:[
      '**Sleep at least 7 hours** before a long run. **Take a break at least every 2 hours.**',
      'Warning signs are yawning, heavy eyes and drifting in your lane. If you are sleepy, pull over safely, rest or swap drivers, and tell your supervisor.',
      'Do not rush to meet a flight. Arriving late is better than not arriving.',
      'Phone, food, music and talking can pull your attention away. Eyes on the road, hands on the wheel.'],
     id:[
      '**Tidur minimal 7 jam** sebelum perjalanan jauh. **Istirahat minimal setiap 2 jam.**',
      'Tanda-tanda bahayanya adalah menguap, mata berat, dan keluar dari jalur. Jika mengantuk, menepilah dengan aman, istirahat atau bergantian pengemudi, dan beri tahu atasan Anda.',
      'Jangan terburu-buru mengejar jadwal penerbangan. Terlambat lebih baik daripada tidak sampai.',
      'Ponsel, makanan, musik, dan mengobrol bisa mengalihkan perhatian Anda. Mata ke jalan, tangan di setir.'],
     ms:[
      '**Tidur sekurang-kurangnya 7 jam** sebelum perjalanan jauh. **Berehat sekurang-kurangnya setiap 2 jam.**',
      'Tanda amaran ialah menguap, mata berat dan tersasar dari lorong. Jika mengantuk, berhenti di tepi dengan selamat, berehat atau bertukar pemandu, dan beritahu penyelia anda.',
      'Jangan tergesa-gesa mengejar penerbangan. Tiba lewat lebih baik daripada tidak tiba.',
      'Telefon, makanan, muzik dan berbual boleh mengalihkan perhatian anda. Mata ke jalan, tangan di stereng.']
    } },
  { t:{ en:'If something goes wrong', id:'Jika terjadi sesuatu', ms:'Jika sesuatu berlaku' },
    i:{
     en:[
      '**Breakdown:** switch on hazard lights, move passengers to a safe place away from traffic, set the warning triangle, and call your supervisor.',
      '**Crash or near miss:** stop safely, check for injuries, and call the emergency contact you were given at induction. Then call your supervisor and HSSE or security.',
      'Report every incident and near miss, even small ones. Reporting prevents the next one.',
      'You have the authority to stop any unsafe situation. You will never be punished for stopping safely.'],
     id:[
      '**Mogok:** nyalakan lampu hazard, pindahkan penumpang ke tempat aman jauh dari lalu lintas, pasang segitiga pengaman, dan hubungi atasan Anda.',
      '**Tabrakan atau nyaris celaka:** berhenti dengan aman, periksa apakah ada yang cedera, dan hubungi kontak darurat yang diberikan saat induksi. Lalu hubungi atasan Anda dan HSSE atau keamanan.',
      'Laporkan setiap insiden dan nyaris celaka, sekecil apa pun. Pelaporan mencegah kejadian berikutnya.',
      'Anda berwenang menghentikan situasi apa pun yang tidak aman. Anda tidak akan pernah dihukum karena berhenti dengan aman.'],
     ms:[
      '**Kenderaan rosak:** hidupkan lampu kecemasan, bawa penumpang ke tempat selamat jauh dari lalu lintas, pasang segi tiga amaran, dan hubungi penyelia anda.',
      '**Kemalangan atau nyaris kemalangan:** berhenti dengan selamat, periksa jika ada yang cedera, dan hubungi kenalan kecemasan yang diberikan semasa induksi. Kemudian hubungi penyelia anda dan HSSE atau keselamatan.',
      'Laporkan setiap insiden dan nyaris kemalangan, walaupun kecil. Pelaporan mencegah kejadian seterusnya.',
      'Anda berhak menghentikan sebarang keadaan yang tidak selamat. Anda tidak akan sekali-kali dihukum kerana berhenti dengan selamat.']
    } }
 ]
};
