require 'set'
require 'mysql'
#require './thread-dumper'

use Rack::Static , :urls => { "/" => "index.html", 
			      "/tagdat.js" => "tagdat.js" } , :root => "public"

$base_weight = 48
$database = 'tagdat'
Vote = Struct.new(:tag, :weight)

map '/tagdat' do
  test = proc do |env|
    req = Rack::Request.new env
    res = Rack::Response.new 
    res.header['Content-Type'] = 'text/javascript'

    json = nil

    ip = env['HTTP_X_FORWARDED_FOR']
    id = req.cookies['id']
    id = ip if id.nil? or id.size < 1
    seq = req.cookies['seq']
    seq = "-1" if seq.nil? or seq.size < 1
    seq = (seq.to_i(10) + 1) % 1024
    url = req.referrer
    url = "http://127.0.0.1" if url.nil? or url.size < 1
    item = url
    item = req['item'] if !req['item'].nil? and req['item'].size > 0
    item = item[0,255]
    res.set_cookie('id',id)
    res.set_cookie('seq',seq)
    prefix = ''
    prefix = req['jsonp'] + '(' if req['jsonp']
    postfix = ''
    postfix = ');' if req['jsonp']
    query = req['query']
    query = 'hit' if req['query'].nil? or req['query'].size < 1
    limit = req['limit']
    limit = 50 if limit.nil? or limit.size < 1
    max = req['max']
    max = 32 if max.nil? or max.size < 1
    domain = req['domain']
    domain = '%' if req['domain'].nil? or domain.size < 1

    begin
      db = Mysql.new(ENV['OPENSHIFT_MYSQL_DB_HOST'],ENV['OPENSHIFT_MYSQL_DB_USERNAME'],ENV['OPENSHIFT_MYSQL_DB_PASSWORD'],$database,ENV['OPENSHIFT_MYSQL_DB_PORT'].to_i(10))

#      begin
#        select = db.prepare "insert ignore into etaoin (time,id,seq,agent,url,query) VALUES (unix_timestamp(),?,?,?,?,?);"
#        select.execute(id,seq,req.user_agent,url,query)
#      ensure
#        select.close if select
#      end

      ban_factor = 1
      begin
        select = db.prepare "select ip from bans where ip = ?;"
        select.execute(ip)
        ban_factor = 0 if select.num_rows > 0
      ensure
        select.close if select
      end

      if !req['parent'].nil? and req['parent'].size > 0 and req['parent'] != req['item']
        parent = req['parent'][0,255]
        begin
          select = db.prepare "insert ignore into parentage (child,parent,ip,time) values (?,?,?,unix_timestamp());"
          select.execute(item,parent,ip)
        ensure
          select.close if select
        end
      end

      current_tags = Array.new
      begin
        select = db.prepare "select cumulative.tag from (select tag, sum(weight) as total from tags where item = ? group by tag) cumulative where cumulative.total > 0 order by cumulative.total desc limit ?;"
        select.execute(item,max)
        select.each do |row| 
          current_tags += row
        end
      ensure
        select.close if select
      end
      current_tags = Set.new current_tags

      if !req['tags'].nil? and req['tags'].size > 0
        tags = req['tags']
        tags = tags.downcase.gsub(/,/,' ').gsub(/[^a-z0-9 \-_]*/,'').gsub(/ +/,' ')
        tags = tags.split(' ')
        tags.uniq!
        tags.map! {|x| x[0,32]}

        affirmed_tags = (current_tags & tags).to_a
        new_tags = ((Set.new tags) - current_tags).to_a
        old_tags = (current_tags - tags).to_a

        votes = Array.new
        new_tags.each {|tag| votes << Vote.new(tag,ban_factor*$base_weight)}
        old_tags.each {|tag| votes << Vote.new(tag,ban_factor*$base_weight*-1)}
        affirmed_tags.each {|tag| votes << Vote.new(tag,ban_factor*$base_weight/3)}

        (0..4).each do |i|
          break if item.nil?
          votes.each do |vote|
            begin
              select = db.prepare "insert ignore into tags (ip, tag, weight, item, time) values (?, ?, ?, ?, unix_timestamp());"
              select.execute(ip, vote.tag, vote.weight/(2**i), item)
            ensure
              select.close if select
            end
          end

          begin
            select = db.prepare "select parent from parentage where child = ? limit 1;"
            select.execute(item)
            item = nil
            select.each do |row|
              item = row[0]
            end
          ensure
            select.close if select
          end
        end

      end

      if query != 'hit'
        begin
          select = db.prepare "select cumulative.item from (select item, sum(weight) as total from tags where tag = ? and item like ? group by item) cumulative where cumulative.total > 0 order by cumulative.total desc limit ?;"
          select.execute(query,domain,limit)
          urls = Array.new
          select.each do |row|
            urls += row
          end
          json = "#{prefix}#{urls}#{postfix}"
        ensure
          select.close if select
        end
      end

      rescue 
        json = "#{prefix}[\"#{$!}\"]#{postfix}"
      ensure
        db.close if db
    end
    
    json = "#{prefix}#{current_tags.to_a}#{postfix}" if json.nil?
    res.write json
    res.finish
  end
  run test
end
